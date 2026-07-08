import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFrontendApi } from '../apps/frontend/src/api/frontend-api-adapter'
import { createFrontendConfig, createFrontendEnv } from '../apps/frontend/src/env'

const gatewayStatus = { message: 'frontend is connected', service: 'api-gateway' } as const

test('frontend env config owns the API Gateway base URL passed into the Frontend API Adapter', async () => {
  assert.deepEqual(createFrontendConfig(createFrontendEnv({})), {
    apiGatewayBaseUrl: 'http://localhost:3000',
    dummyAuthLoginShortcutEnabled: false,
  })

  const config = createFrontendConfig(
    createFrontendEnv({
      API_GATEWAY_BASE_URL: 'http://unprefixed-api-gateway.test',
      VITE_API_GATEWAY_BASE_URL: 'https://api-gateway.example.test',
      VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled',
    }),
  )
  let requestedUrl = ''
  const api = createFrontendApi({
    baseUrl: config.apiGatewayBaseUrl,
    async fetch(request) {
      requestedUrl = request.url

      return Response.json({ json: gatewayStatus })
    },
  })

  assert.deepEqual(config, {
    apiGatewayBaseUrl: 'https://api-gateway.example.test',
    dummyAuthLoginShortcutEnabled: true,
  })
  assert.deepEqual(await api.getGatewayStatus(), gatewayStatus)
  assert.equal(requestedUrl, 'https://api-gateway.example.test/rpc/v1/gateway/status')
  assert.throws(() => createFrontendEnv({ VITE_API_GATEWAY_BASE_URL: 'not-a-url' }), /Invalid environment variables/)
})
