import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type AuthProviderAdapter, createIdentityApp } from '@megiddo/identity'
import type { IdentityTokenSigner } from '@megiddo/platform'
import { identityServiceConfigFromEnv } from './support/identity-service-config'

const authProvider: AuthProviderAdapter = {
  async listDummyAccounts() {
    return []
  },
  async resolveDummyPrincipal() {
    return undefined
  },
  async resolveDevelopmentUser(subject = 'dev:viewer') {
    return { id: subject }
  },
}

const tokenSigner: IdentityTokenSigner = {
  async issueIdentityToken() {
    return 'test-token'
  },
}

const identityHealth = async (app: ReturnType<typeof createIdentityApp>) => {
  const response = await app.request('/health')

  assert.equal(response.status, 200)

  return response.json()
}

test('Identity startup exposes explicit auth provider and token codec modes', async () => {
  const app = createIdentityApp({
    authProvider,
    serviceConfig: identityServiceConfigFromEnv({
      IDENTITY_AUTH_PROVIDER: 'better-auth',
      IDENTITY_TOKEN_CODEC: 'jwt-jws',
    }),
    tokenSigner,
  })

  assert.deepEqual(await identityHealth(app), {
    identity: {
      authProvider: 'better-auth',
      tokenCodec: 'jwt-jws',
    },
    message: 'identity service is running',
    service: 'identity',
  })
})

test('MEGIDDO_AUTH_PROFILE=local-dummy expands to dummy Identity defaults with overrideable settings', async () => {
  const localDummyApp = createIdentityApp({
    authProvider,
    serviceConfig: identityServiceConfigFromEnv({ MEGIDDO_AUTH_PROFILE: 'local-dummy' }),
    tokenSigner,
  })
  const overriddenApp = createIdentityApp({
    authProvider,
    serviceConfig: identityServiceConfigFromEnv({
      IDENTITY_TOKEN_CODEC: 'jwt-jws',
      MEGIDDO_AUTH_PROFILE: 'local-dummy',
    }),
    tokenSigner,
  })

  assert.deepEqual((await identityHealth(localDummyApp)).identity, {
    authProvider: 'dummy',
    tokenCodec: 'dummy',
  })
  assert.deepEqual((await identityHealth(overriddenApp)).identity, {
    authProvider: 'dummy',
    tokenCodec: 'jwt-jws',
  })
})

test('Identity startup rejects unknown mode values', () => {
  assert.throws(
    () =>
      identityServiceConfigFromEnv({
        IDENTITY_AUTH_PROVIDER: 'oauth',
        IDENTITY_TOKEN_CODEC: 'dummy',
      }),
    /Invalid environment variables/,
  )
})

test('Identity refuses dummy auth and dummy token codec in production startup', () => {
  assert.throws(
    () =>
      identityServiceConfigFromEnv({
        IDENTITY_AUTH_PROVIDER: 'dummy',
        IDENTITY_TOKEN_CODEC: 'jwt-jws',
        NODE_ENV: 'production',
      }),
    /IDENTITY_AUTH_PROVIDER=dummy is not allowed when NODE_ENV=production/,
  )

  assert.throws(
    () =>
      identityServiceConfigFromEnv({
        IDENTITY_AUTH_PROVIDER: 'better-auth',
        IDENTITY_TOKEN_CODEC: 'dummy',
        NODE_ENV: 'production',
      }),
    /IDENTITY_TOKEN_CODEC=dummy is not allowed when NODE_ENV=production/,
  )
})
