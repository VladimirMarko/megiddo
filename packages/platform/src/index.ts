import type { IdentityTokenAudienceV1, IdentityTokenClaimsV1 } from '@megiddo/contracts'
import { context, propagation, type Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'

export const apiGatewayRpcMountPath = '/rpc'
export const identityRpcMountPath = '/rpc'
export const todoRpcMountPath = '/rpc'

export const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${apiGatewayRpcMountPath}`
export const identityRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${identityRpcMountPath}`
export const todoRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${todoRpcMountPath}`

type OrpcServiceRole = 'client' | 'server'
type OrpcStatus = 'error' | 'ok'

interface OrpcSpanAttributesOptions {
  procedure: string
  role: OrpcServiceRole
  serviceName: string
}

interface InstrumentedOrpcClientFetchOptions {
  fetch?: (request: Request) => Promise<Response>
  procedure: string
  serviceName: string
}

interface HandleInstrumentedOrpcServerRequestOptions<ResponseType> {
  handle: () => Promise<ResponseType>
  procedure: string
  request: Request
  serviceName: string
}

const tracer = trace.getTracer('@megiddo/platform/orpc')

const headersGetter = {
  get(headers: Headers, key: string) {
    return headers.get(key) ?? undefined
  },
  keys(headers: Headers) {
    return [...headers.keys()]
  },
}

const headersSetter = {
  set(headers: Headers, key: string, value: string) {
    headers.set(key, value)
  },
}

const spanName = ({ procedure, role, serviceName }: OrpcSpanAttributesOptions) =>
  `${serviceName} oRPC ${role} ${procedure}`

const orpcSpanAttributes = ({ procedure, role, serviceName }: OrpcSpanAttributesOptions) => ({
  'orpc.procedure': procedure,
  'orpc.role': role,
  'service.name': serviceName,
})

const recordOrpcException = (span: Span, error: unknown) => {
  span.recordException(error instanceof Error ? error : new Error(String(error)))
  span.setAttribute('error.type', error instanceof Error ? error.name : typeof error)
}

const finishOrpcSpan = (span: Span, startTime: number, status: OrpcStatus) => {
  span.setAttribute('orpc.duration_ms', Date.now() - startTime)
  span.setAttribute('orpc.status', status)
  span.setStatus({ code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR })
  span.end()
}

export const createInstrumentedOrpcClientFetch =
  ({ fetch = request => globalThis.fetch(request), procedure, serviceName }: InstrumentedOrpcClientFetchOptions) =>
  async (request: Request) => {
    const startTime = Date.now()
    const role = 'client'
    const span = tracer.startSpan(spanName({ procedure, role, serviceName }), {
      attributes: orpcSpanAttributes({ procedure, role, serviceName }),
      kind: SpanKind.CLIENT,
    })
    const headers = new Headers(request.headers)
    propagation.inject(trace.setSpan(context.active(), span), headers, headersSetter)

    try {
      const response = await fetch(new Request(request, { headers }))
      finishOrpcSpan(span, startTime, response.ok ? 'ok' : 'error')

      return response
    } catch (error) {
      recordOrpcException(span, error)
      span.setAttribute('http.request.url', request.url)
      finishOrpcSpan(span, startTime, 'error')
      throw error
    }
  }

export const handleInstrumentedOrpcServerRequest = async <ResponseType>({
  handle,
  procedure,
  request,
  serviceName,
}: HandleInstrumentedOrpcServerRequestOptions<ResponseType>) => {
  const startTime = Date.now()
  const role = 'server'
  const parentContext = propagation.extract(context.active(), request.headers, headersGetter)
  const span = tracer.startSpan(
    spanName({ procedure, role, serviceName }),
    {
      attributes: orpcSpanAttributes({ procedure, role, serviceName }),
      kind: SpanKind.SERVER,
    },
    parentContext,
  )

  try {
    const response = await handle()
    finishOrpcSpan(span, startTime, 'ok')

    return response
  } catch (error) {
    recordOrpcException(span, error)
    finishOrpcSpan(span, startTime, 'error')
    throw error
  }
}

export const orpcProcedureFromRequest = (request: Request) => {
  const { pathname } = new URL(request.url)

  return pathname.replace(/^\/+/, '').replaceAll('/', '.')
}

const identityTokenHeader = { alg: 'EdDSA', typ: 'megiddo.identity-token.v1' }
const privateKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64'
const publicKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64'
type DevelopmentIdentityTokenKeyPair = { privateKeyPem: string; publicKeyPem: string }
type DevelopmentIdentityTokenKeyPairEnv = Record<typeof privateKeyEnvName | typeof publicKeyEnvName, string>

export interface IdentityTokenSigner {
  issueIdentityToken(claims: Omit<IdentityTokenClaimsV1, 'issuedAt'>): Promise<string>
}

export interface IdentityTokenVerifier {
  verifyIdentityToken(input: {
    identityToken: string
    audience: IdentityTokenAudienceV1
  }): Promise<IdentityTokenClaimsV1>
}

const base64UrlEncode = (input: Buffer | string) => Buffer.from(input).toString('base64url')
const base64UrlDecode = (input: string) => Buffer.from(input, 'base64url')

const generateDevelopmentIdentityTokenKeyPair = async (): Promise<DevelopmentIdentityTokenKeyPair> => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')

  return {
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  }
}

export const createDevelopmentIdentityTokenKeyPairEnv = async (): Promise<DevelopmentIdentityTokenKeyPairEnv> => {
  const { privateKeyPem, publicKeyPem } = await generateDevelopmentIdentityTokenKeyPair()

  return {
    [privateKeyEnvName]: base64UrlEncode(privateKeyPem),
    [publicKeyEnvName]: base64UrlEncode(publicKeyPem),
  }
}

interface DevelopmentIdentityTokenCodecOptions {
  privateKeyPem?: string
  publicKeyPem?: string
}

const readDevelopmentIdentityTokenKeyPair = (): DevelopmentIdentityTokenCodecOptions => {
  const privateKeyPemBase64 = process.env[privateKeyEnvName]
  const publicKeyPemBase64 = process.env[publicKeyEnvName]

  return {
    privateKeyPem: privateKeyPemBase64 ? base64UrlDecode(privateKeyPemBase64).toString('utf8') : undefined,
    publicKeyPem: publicKeyPemBase64 ? base64UrlDecode(publicKeyPemBase64).toString('utf8') : undefined,
  }
}

export const createDevelopmentIdentityTokenCodec = (
  { privateKeyPem, publicKeyPem }: DevelopmentIdentityTokenCodecOptions = readDevelopmentIdentityTokenKeyPair(),
): IdentityTokenSigner & IdentityTokenVerifier => {
  let keyPair: DevelopmentIdentityTokenKeyPair | undefined

  const ensureKeyPair = async () => {
    if (keyPair) {
      return keyPair
    }

    keyPair =
      privateKeyPem && publicKeyPem ? { privateKeyPem, publicKeyPem } : await generateDevelopmentIdentityTokenKeyPair()

    return keyPair
  }

  return {
    async issueIdentityToken(claims) {
      const { createPrivateKey, sign } = await import('node:crypto')
      const { privateKeyPem } = await ensureKeyPair()
      const header = base64UrlEncode(JSON.stringify(identityTokenHeader))
      const payload = base64UrlEncode(JSON.stringify({ ...claims, issuedAt: Date.now() }))
      const signedContent = `${header}.${payload}`
      const signature = sign(null, Buffer.from(signedContent), createPrivateKey(privateKeyPem))

      return `${signedContent}.${base64UrlEncode(signature)}`
    },
    async verifyIdentityToken({ identityToken, audience }) {
      const { createPublicKey, verify } = await import('node:crypto')
      const { publicKeyPem } = await ensureKeyPair()
      const [header, payload, signature, extra] = identityToken.split('.')

      if (!header || !payload || !signature || extra) {
        throw new Error('Invalid Identity Token format')
      }

      const signedContent = `${header}.${payload}`
      const verified = verify(
        null,
        Buffer.from(signedContent),
        createPublicKey(publicKeyPem),
        base64UrlDecode(signature),
      )

      if (!verified) {
        throw new Error('Invalid Identity Token signature')
      }

      const claims = JSON.parse(base64UrlDecode(payload).toString('utf8')) as IdentityTokenClaimsV1

      if (claims.audience.service !== audience.service) {
        throw new Error(`Identity Token audience mismatch: expected ${audience.service}`)
      }

      return claims
    },
  }
}
