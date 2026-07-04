import type { IdentityTokenAudienceV1, IdentityTokenClaimsV1 } from '@megiddo/contracts'

export const apiGatewayRpcMountPath = '/rpc'
export const identityRpcMountPath = '/rpc'
export const todoRpcMountPath = '/rpc'

export const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${apiGatewayRpcMountPath}`
export const identityRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${identityRpcMountPath}`
export const todoRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}${todoRpcMountPath}`

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

export const createDevelopmentIdentityTokenCodec = (): IdentityTokenSigner & IdentityTokenVerifier => {
  let keyPair: { privateKeyPem: string | Buffer; publicKeyPem: string | Buffer } | undefined

  const ensureKeyPair = async () => {
    if (!keyPair) {
      const { generateKeyPairSync } = await import('node:crypto')
      const { privateKey, publicKey } = generateKeyPairSync('ed25519')
      keyPair = {
        privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }),
        publicKeyPem: publicKey.export({ format: 'pem', type: 'spki' }),
      }
    }

    return keyPair
  }

  return {
    async issueIdentityToken(claims) {
      const { createPrivateKey, sign } = await import('node:crypto')
      const { privateKeyPem } = await ensureKeyPair()
      const header = base64UrlEncode(JSON.stringify({ alg: 'EdDSA', typ: 'megiddo.identity-token.v1' }))
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
