import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  type AuthProviderAdapter,
  createIdentityApp,
  createIdentityEnv,
  createIdentityServiceConfig,
  createIdentityServiceInfrastructure,
} from '@megiddo/identity'
import { defaultInternalServiceAuthSecret, type IdentityTokenSigner } from '@megiddo/platform'

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

test('Identity env validates defaults from an explicit empty runtime env', () => {
  const env = createIdentityEnv({})

  assert.deepEqual(env, {
    BETTER_AUTH_SECRET: undefined,
    BETTER_AUTH_URL: undefined,
    IDENTITY_AUTH_PROVIDER: undefined,
    IDENTITY_BETTER_AUTH_BASE_URL: undefined,
    IDENTITY_BETTER_AUTH_DATABASE_PATH: '.data/identity/better-auth.sqlite',
    IDENTITY_DATABASE_PATH: '.data/identity/identity.sqlite',
    IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS: undefined,
    IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: defaultInternalServiceAuthSecret,
    IDENTITY_TOKEN_CODEC: undefined,
    MEGIDDO_AUTH_PROFILE: undefined,
    MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: undefined,
    MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: undefined,
    NODE_ENV: undefined,
    PORT: 3002,
  })
})

test('Identity env rejects invalid enum values and ports', () => {
  assert.throws(() => createIdentityEnv({ IDENTITY_AUTH_PROVIDER: 'oauth' }), /Invalid environment variables/)
  assert.throws(() => createIdentityEnv({ IDENTITY_TOKEN_CODEC: 'opaque' }), /Invalid environment variables/)
  assert.throws(() => createIdentityEnv({ MEGIDDO_AUTH_PROFILE: 'production' }), /Invalid environment variables/)
  assert.throws(() => createIdentityEnv({ PORT: '0' }), /Invalid environment variables/)
  assert.throws(() => createIdentityEnv({ PORT: '65536' }), /Invalid environment variables/)
})

test('Identity service config derives modes and service-facing values', () => {
  assert.deepEqual(createIdentityServiceConfig(createIdentityEnv({ MEGIDDO_AUTH_PROFILE: 'local-dummy' })), {
    authProvider: 'dummy',
    betterAuthBaseUrl: undefined,
    betterAuthDatabasePath: '.data/identity/better-auth.sqlite',
    betterAuthSecret: undefined,
    developmentAuthDatabasePath: '.data/identity/identity.sqlite',
    internalServiceAuthSecret: defaultInternalServiceAuthSecret,
    seedDemoAccounts: true,
    tokenCodec: 'dummy',
    tokenPrivateKeyPemBase64: undefined,
    tokenPublicKeyPemBase64: undefined,
    port: 3002,
  })

  assert.deepEqual(
    createIdentityServiceConfig(
      createIdentityEnv({
        BETTER_AUTH_URL: 'http://localhost:4000',
        BETTER_AUTH_SECRET: 'better-auth-secret',
        IDENTITY_AUTH_PROVIDER: 'better-auth',
        IDENTITY_BETTER_AUTH_BASE_URL: 'http://localhost:5000',
        IDENTITY_BETTER_AUTH_DATABASE_PATH: '/tmp/better-auth.sqlite',
        IDENTITY_DATABASE_PATH: '/tmp/identity.sqlite',
        IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS: 'enabled',
        IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: 'secret',
        IDENTITY_TOKEN_CODEC: 'jwt-jws',
        MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: 'private',
        MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: 'public',
        PORT: '4102',
      }),
    ),
    {
      authProvider: 'better-auth',
      betterAuthBaseUrl: 'http://localhost:4000',
      betterAuthDatabasePath: '/tmp/better-auth.sqlite',
      betterAuthSecret: 'better-auth-secret',
      developmentAuthDatabasePath: '/tmp/identity.sqlite',
      internalServiceAuthSecret: 'secret',
      seedDemoAccounts: true,
      tokenCodec: 'jwt-jws',
      tokenPrivateKeyPemBase64: 'private',
      tokenPublicKeyPemBase64: 'public',
      port: 4102,
    },
  )
})

test('Identity service config preserves production dummy guards', () => {
  assert.throws(
    () => createIdentityServiceConfig(createIdentityEnv({ IDENTITY_AUTH_PROVIDER: 'dummy', NODE_ENV: 'production' })),
    /IDENTITY_AUTH_PROVIDER=dummy is not allowed when NODE_ENV=production/,
  )

  assert.throws(
    () =>
      createIdentityServiceConfig(
        createIdentityEnv({
          IDENTITY_AUTH_PROVIDER: 'better-auth',
          IDENTITY_TOKEN_CODEC: 'dummy',
          NODE_ENV: 'production',
        }),
      ),
    /IDENTITY_TOKEN_CODEC=dummy is not allowed when NODE_ENV=production/,
  )
})

test('Identity app reports modes from derived service config', async () => {
  const config = createIdentityServiceConfig(
    createIdentityEnv({ IDENTITY_AUTH_PROVIDER: 'better-auth', IDENTITY_TOKEN_CODEC: 'jwt-jws' }),
  )

  const app = createIdentityApp({ authProvider, serviceConfig: config, tokenSigner })

  assert.deepEqual(await identityHealth(app), {
    identity: {
      authProvider: 'better-auth',
      tokenCodec: 'jwt-jws',
    },
    message: 'identity service is running',
    service: 'identity',
  })
})

test('Identity service infrastructure is wired from derived service config', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'megiddo-identity-config-'))
  const databasePath = join(directory, 'identity.sqlite')
  const config = createIdentityServiceConfig(
    createIdentityEnv({ IDENTITY_DATABASE_PATH: databasePath, MEGIDDO_AUTH_PROFILE: 'local-dummy' }),
  )
  const infrastructure = createIdentityServiceInfrastructure(config)

  try {
    const app = createIdentityApp({
      authProvider: infrastructure.authProvider,
      serviceConfig: config,
      tokenSigner: infrastructure.tokenSigner,
    })
    const capabilitiesResponse = await app.request('/rpc/v1/auth/capabilities', {
      body: '{}',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })

    assert.equal(capabilitiesResponse.status, 200)
    assert.equal(existsSync(databasePath), true)
    assert.deepEqual(await capabilitiesResponse.json(), {
      json: {
        dummy: {
          accounts: [
            { displayName: 'Alice', principalId: 'dummy:alice' },
            { displayName: 'Bob', principalId: 'dummy:bob' },
          ],
          signIn: 'available',
          signUp: 'available',
        },
        signInMethods: ['dummy'],
        signUpMethods: ['dummy'],
      },
    })
  } finally {
    infrastructure.close()
    await rm(directory, { force: true, recursive: true })
  }
})
