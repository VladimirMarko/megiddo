import type { IdentityAuthProviderMode, IdentityEnv, IdentityTokenCodecMode } from './env-contract'

export interface IdentityServiceConfig {
  authProvider: IdentityAuthProviderMode
  betterAuthBaseUrl?: string
  betterAuthDatabasePath: string
  betterAuthSecret?: string
  developmentAuthDatabasePath: string
  internalServiceAuthSecret: string
  port: number
  seedDemoAccounts: boolean
  tokenCodec: IdentityTokenCodecMode
  tokenPrivateKeyPemBase64?: string
  tokenPublicKeyPemBase64?: string
}

const deriveAuthProvider = (env: IdentityEnv): IdentityAuthProviderMode => env.IDENTITY_AUTH_PROVIDER ?? 'dummy'

const deriveTokenCodec = (env: IdentityEnv): IdentityTokenCodecMode => env.IDENTITY_TOKEN_CODEC ?? 'dummy'

export const createIdentityServiceConfig = (env: IdentityEnv): IdentityServiceConfig => {
  const authProvider = deriveAuthProvider(env)
  const tokenCodec = deriveTokenCodec(env)

  if (env.NODE_ENV === 'production' && authProvider === 'dummy') {
    throw new Error('IDENTITY_AUTH_PROVIDER=dummy is not allowed when NODE_ENV=production')
  }

  if (env.NODE_ENV === 'production' && tokenCodec === 'dummy') {
    throw new Error('IDENTITY_TOKEN_CODEC=dummy is not allowed when NODE_ENV=production')
  }

  return {
    authProvider,
    betterAuthBaseUrl: env.BETTER_AUTH_URL ?? env.IDENTITY_BETTER_AUTH_BASE_URL,
    betterAuthDatabasePath: env.IDENTITY_BETTER_AUTH_DATABASE_PATH,
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    developmentAuthDatabasePath: env.IDENTITY_DATABASE_PATH,
    internalServiceAuthSecret: env.IDENTITY_INTERNAL_SERVICE_AUTH_SECRET,
    port: env.PORT,
    seedDemoAccounts: env.MEGIDDO_AUTH_PROFILE === 'local-dummy' || env.IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS === 'enabled',
    tokenCodec,
    tokenPrivateKeyPemBase64: env.MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64,
    tokenPublicKeyPemBase64: env.MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64,
  }
}
