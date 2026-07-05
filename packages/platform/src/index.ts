import type { IdentityTokenAudienceV1, IdentityTokenClaimsV1 } from '@megiddo/contracts'

export const apiGatewayRpcMountPath = '/rpc'
export const identityRpcMountPath = '/rpc'
export const todoRpcMountPath = '/rpc'

export const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${apiGatewayRpcMountPath}`
export const identityRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${identityRpcMountPath}`
export const todoRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${todoRpcMountPath}`

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
