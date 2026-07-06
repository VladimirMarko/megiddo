import {
  type IdentityTokenAudienceV1,
  IdentityTokenClaimsSchemaV1,
  type IdentityTokenClaimsV1,
} from '@megiddo/contracts'
import { context, propagation, type Span, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api'

export const apiGatewayRpcMountPath = '/rpc'
export const identityRpcMountPath = '/rpc'
export const todoRpcMountPath = '/rpc'

export const internalServiceHeader = 'x-megiddo-internal-service'
export const internalServiceSecretHeader = 'x-megiddo-internal-service-secret'
export const defaultInternalServiceAuthSecret = 'local-development-internal-service-secret'

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
      if (!response.ok) {
        span.setAttribute('error.type', `HTTP ${response.status}`)
        span.setAttribute('http.request.url', request.url)
        span.setAttribute('http.response.status_code', response.status)
      }
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

const jwtJwsIdentityTokenIssuer = 'megiddo.identity'
const jwtJwsIdentityTokenKeyId = 'local-development'
const jwtJwsIdentityTokenTtlSeconds = 60 * 60
const jwtJwsIdentityTokenHeader = { alg: 'EdDSA', kid: jwtJwsIdentityTokenKeyId, typ: 'JWT' }
const privateKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64'
const publicKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64'
type JwtJwsIdentityTokenKeyPair = { privateKeyPem: string; publicKeyPem: string }
type JwtJwsIdentityTokenKeyPairEnv = Record<typeof privateKeyEnvName | typeof publicKeyEnvName, string>

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
const dummyIdentityTokenPrefix = 'dummy'
const invalidDummyIdentityTokenClaimsError = () => new Error('Invalid dummy Identity Token claims')

const parseDummyIdentityTokenClaims = (payload: string): unknown => {
  try {
    return JSON.parse(base64UrlDecode(payload).toString('utf8'))
  } catch {
    throw invalidDummyIdentityTokenClaimsError()
  }
}

const readDummyIdentityTokenExpiresAt = (claims: unknown) => {
  if (!claims || typeof claims !== 'object' || !('expiresAt' in claims)) {
    return undefined
  }

  const { expiresAt } = claims

  if (typeof expiresAt !== 'number' || !Number.isInteger(expiresAt)) {
    throw invalidDummyIdentityTokenClaimsError()
  }

  return expiresAt
}

export const createDummyIdentityTokenCodec = (): IdentityTokenSigner & IdentityTokenVerifier => ({
  async issueIdentityToken(claims) {
    return `${dummyIdentityTokenPrefix}.${base64UrlEncode(JSON.stringify({ ...claims, issuedAt: Date.now() }))}`
  },
  async verifyIdentityToken({ identityToken, audience }) {
    const [prefix, payload, extra] = identityToken.split('.')

    if (prefix !== dummyIdentityTokenPrefix || !payload || extra) {
      throw new Error('Invalid dummy Identity Token format')
    }

    const decodedClaims = parseDummyIdentityTokenClaims(payload)
    const parsedClaims = IdentityTokenClaimsSchemaV1.safeParse(decodedClaims)
    if (!parsedClaims.success) {
      throw invalidDummyIdentityTokenClaimsError()
    }

    if (parsedClaims.data.audience.service !== audience.service) {
      throw new Error(`Identity Token audience mismatch: expected ${audience.service}`)
    }

    const expiresAt = readDummyIdentityTokenExpiresAt(decodedClaims)
    if (expiresAt !== undefined) {
      if (expiresAt <= Date.now()) {
        throw new Error('Identity Token expired')
      }
    }

    return parsedClaims.data
  },
})

const generateJwtJwsIdentityTokenKeyPair = async (): Promise<JwtJwsIdentityTokenKeyPair> => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')

  return {
    privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
    publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  }
}

export const createJwtJwsIdentityTokenKeyPairEnv = async (): Promise<JwtJwsIdentityTokenKeyPairEnv> => {
  const { privateKeyPem, publicKeyPem } = await generateJwtJwsIdentityTokenKeyPair()

  return {
    [privateKeyEnvName]: base64UrlEncode(privateKeyPem),
    [publicKeyEnvName]: base64UrlEncode(publicKeyPem),
  }
}

interface JwtJwsIdentityTokenCodecOptions {
  env?: NodeJS.ProcessEnv
  privateKeyPem?: string
  publicKeyPem?: string
  tokenTtlSeconds?: number
}

interface JwtJwsIdentityTokenClaims {
  aud: string
  contractVersion?: string
  exp: number
  iat: number
  iss: typeof jwtJwsIdentityTokenIssuer
  sub: string
}

const readJwtJwsIdentityTokenKeyPair = (env: NodeJS.ProcessEnv = {}): JwtJwsIdentityTokenCodecOptions => {
  const privateKeyPemBase64 = env[privateKeyEnvName]
  const publicKeyPemBase64 = env[publicKeyEnvName]

  return {
    privateKeyPem: privateKeyPemBase64 ? base64UrlDecode(privateKeyPemBase64).toString('utf8') : undefined,
    publicKeyPem: publicKeyPemBase64 ? base64UrlDecode(publicKeyPemBase64).toString('utf8') : undefined,
  }
}

const parseJwtJwsJson = (value: string, error: Error) => {
  try {
    return JSON.parse(base64UrlDecode(value).toString('utf8')) as unknown
  } catch {
    throw error
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'

const parseJwtJwsIdentityTokenHeader = (header: string) => {
  const decodedHeader = parseJwtJwsJson(header, new Error('Invalid JWT/JWS Identity Token header'))

  if (!isRecord(decodedHeader)) {
    throw new Error('Unsupported JWT/JWS Identity Token header')
  }

  if (
    decodedHeader.alg !== jwtJwsIdentityTokenHeader.alg ||
    decodedHeader.typ !== jwtJwsIdentityTokenHeader.typ ||
    decodedHeader.kid !== jwtJwsIdentityTokenHeader.kid
  ) {
    throw new Error('Unsupported JWT/JWS Identity Token header')
  }

  return decodedHeader
}

const parseJwtJwsIdentityTokenPayload = (payload: string) => {
  const decodedPayload = parseJwtJwsJson(payload, new Error('Invalid JWT/JWS Identity Token claims'))

  if (!isRecord(decodedPayload)) {
    throw new Error('Invalid JWT/JWS Identity Token claims')
  }

  const { aud, contractVersion, exp, iat, iss, sub } = decodedPayload
  if (
    iss !== jwtJwsIdentityTokenIssuer ||
    typeof sub !== 'string' ||
    sub.length === 0 ||
    typeof aud !== 'string' ||
    aud.length === 0 ||
    typeof iat !== 'number' ||
    !Number.isInteger(iat) ||
    iat < 0 ||
    typeof exp !== 'number' ||
    !Number.isInteger(exp) ||
    (contractVersion !== undefined && (typeof contractVersion !== 'string' || contractVersion.length === 0))
  ) {
    throw new Error('Invalid JWT/JWS Identity Token claims')
  }

  return { aud, contractVersion, exp, iat, iss, sub } satisfies JwtJwsIdentityTokenClaims
}

export const createJwtJwsIdentityTokenCodec = (
  options: JwtJwsIdentityTokenCodecOptions = {},
): IdentityTokenSigner & IdentityTokenVerifier => {
  const keyPairOptions = readJwtJwsIdentityTokenKeyPair(options.env)
  const privateKeyPem = options.privateKeyPem ?? keyPairOptions.privateKeyPem
  const publicKeyPem = options.publicKeyPem ?? keyPairOptions.publicKeyPem
  const tokenTtlSeconds = options.tokenTtlSeconds ?? jwtJwsIdentityTokenTtlSeconds
  let keyPair: JwtJwsIdentityTokenKeyPair | undefined

  const ensureKeyPair = async () => {
    if (keyPair) {
      return keyPair
    }

    keyPair =
      privateKeyPem && publicKeyPem ? { privateKeyPem, publicKeyPem } : await generateJwtJwsIdentityTokenKeyPair()

    return keyPair
  }
  const ensurePublicKeyPem = async () => {
    if (publicKeyPem) {
      return publicKeyPem
    }

    return (await ensureKeyPair()).publicKeyPem
  }

  return {
    async issueIdentityToken(claims) {
      const { createPrivateKey, sign } = await import('node:crypto')
      const { privateKeyPem } = await ensureKeyPair()
      const issuedAtSeconds = Math.floor(Date.now() / 1000)
      const tokenClaims: JwtJwsIdentityTokenClaims = {
        aud: claims.audience.service,
        contractVersion: claims.contractVersion,
        exp: issuedAtSeconds + tokenTtlSeconds,
        iat: issuedAtSeconds,
        iss: jwtJwsIdentityTokenIssuer,
        sub: claims.subject,
      }
      const header = base64UrlEncode(JSON.stringify(jwtJwsIdentityTokenHeader))
      const payload = base64UrlEncode(JSON.stringify(tokenClaims))
      const signedContent = `${header}.${payload}`
      const signature = sign(null, Buffer.from(signedContent), createPrivateKey(privateKeyPem))

      return `${signedContent}.${base64UrlEncode(signature)}`
    },
    async verifyIdentityToken({ identityToken, audience }) {
      const { createPublicKey, verify } = await import('node:crypto')
      const publicKeyPem = await ensurePublicKeyPem()
      const [header, payload, signature, extra] = identityToken.split('.')

      if (!header || !payload || !signature || extra) {
        throw new Error('Invalid JWT/JWS Identity Token format')
      }

      parseJwtJwsIdentityTokenHeader(header)

      const signedContent = `${header}.${payload}`
      const verified = verify(
        null,
        Buffer.from(signedContent),
        createPublicKey(publicKeyPem),
        base64UrlDecode(signature),
      )

      if (!verified) {
        throw new Error('Invalid JWT/JWS Identity Token signature')
      }

      const tokenClaims = parseJwtJwsIdentityTokenPayload(payload)

      if (tokenClaims.aud !== audience.service) {
        throw new Error(`Identity Token audience mismatch: expected ${audience.service}`)
      }

      if (tokenClaims.exp <= Math.floor(Date.now() / 1000)) {
        throw new Error('Identity Token expired')
      }

      const claims = IdentityTokenClaimsSchemaV1.parse({
        audience: { service: tokenClaims.aud },
        contractVersion: tokenClaims.contractVersion,
        issuedAt: tokenClaims.iat * 1000,
        subject: tokenClaims.sub,
      })

      return claims
    },
  }
}
