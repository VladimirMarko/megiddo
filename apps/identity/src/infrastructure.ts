import {
  createDummyIdentityTokenCodec,
  createJwtJwsIdentityTokenCodec,
  type IdentityTokenSigner,
} from '@megiddo/platform'
import type { IdentityServiceConfig } from './config-builder'
import {
  createEmbeddedBetterAuthProviderAdapter,
  type EmbeddedBetterAuthProviderAdapter,
} from './embedded-better-auth-provider-adapter'
import {
  createEmbeddedDevelopmentAuthProviderAdapter,
  type EmbeddedDevelopmentAuthProviderAdapter,
} from './embedded-development-auth-provider-adapter'
import type { AuthProviderAdapter } from './identity-use-cases'

export interface IdentityServiceInfrastructure {
  authProvider: AuthProviderAdapter
  close(): void
  tokenSigner: IdentityTokenSigner
}

const createIdentityAuthProvider = (
  config: IdentityServiceConfig,
): EmbeddedBetterAuthProviderAdapter | EmbeddedDevelopmentAuthProviderAdapter => {
  if (config.authProvider === 'dummy') {
    return createEmbeddedDevelopmentAuthProviderAdapter({
      databasePath: config.developmentAuthDatabasePath,
      seedDemoAccounts: config.seedDemoAccounts,
    })
  }

  return createEmbeddedBetterAuthProviderAdapter({
    baseURL: config.betterAuthBaseUrl,
    databasePath: config.betterAuthDatabasePath,
  })
}

export const createIdentityTokenSigner = (config: IdentityServiceConfig): IdentityTokenSigner => {
  if (config.tokenCodec === 'dummy') {
    return createDummyIdentityTokenCodec()
  }

  return createJwtJwsIdentityTokenCodec({
    env: {
      MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: config.tokenPrivateKeyPemBase64,
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: config.tokenPublicKeyPemBase64,
    },
  })
}

export const createIdentityServiceInfrastructure = (config: IdentityServiceConfig): IdentityServiceInfrastructure => {
  const authProvider = createIdentityAuthProvider(config)

  return {
    authProvider,
    close() {
      authProvider.close()
    },
    tokenSigner: createIdentityTokenSigner(config),
  }
}
