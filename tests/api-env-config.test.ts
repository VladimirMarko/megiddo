import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayEnv, createApiGatewayServiceConfig } from '@megiddo/api'
import { defaultInternalServiceAuthSecret } from '@megiddo/platform'

test('API env validates defaults from an explicit empty runtime env', () => {
  const env = createApiGatewayEnv({})

  assert.deepEqual(env, {
    IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: defaultInternalServiceAuthSecret,
    IDENTITY_SERVICE_URL: 'http://localhost:3002',
    PORT: 3000,
    TODO_SERVICE_URL: 'http://localhost:3001',
  })
})

test('API env parses PORT as a TCP port number', () => {
  assert.equal(createApiGatewayEnv({ PORT: '4321' }).PORT, 4321)

  assert.throws(() => createApiGatewayEnv({ PORT: '0' }), /Invalid environment variables/)
  assert.throws(() => createApiGatewayEnv({ PORT: '65536' }), /Invalid environment variables/)
  assert.throws(() => createApiGatewayEnv({ PORT: 'not-a-port' }), /Invalid environment variables/)
})

test('API env rejects invalid service URLs and internal auth secret', () => {
  assert.throws(() => createApiGatewayEnv({ TODO_SERVICE_URL: 'not-a-url' }), /Invalid environment variables/)
  assert.throws(() => createApiGatewayEnv({ IDENTITY_SERVICE_URL: 'not-a-url' }), /Invalid environment variables/)
  assert.throws(
    () => createApiGatewayEnv({ IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: '' }),
    /Invalid environment variables/,
  )
})

test('API service config derives service-facing names from env-shaped output', () => {
  const config = createApiGatewayServiceConfig(
    createApiGatewayEnv({
      IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: 'configured-secret',
      IDENTITY_SERVICE_URL: 'http://identity.example.test',
      PORT: '4444',
      TODO_SERVICE_URL: 'http://todo.example.test',
    }),
  )

  assert.deepEqual(config, {
    identityInternalServiceAuthSecret: 'configured-secret',
    identityServiceUrl: 'http://identity.example.test',
    port: 4444,
    todoServiceUrl: 'http://todo.example.test',
  })
})
