import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createFrontendApi } from '../apps/frontend/src/api/frontend-api-adapter'
import { createFrontendConfig, createFrontendEnv } from '../apps/frontend/src/env'

const gatewayStatus = { message: 'frontend is connected', service: 'api-gateway' } as const
const defaultApiGatewayBaseUrl = 'http://localhost:3000'
const viteApiGatewayBaseUrl = 'https://api-gateway.example.test'

test('frontend env config defaults the API Gateway base URL for local development', () => {
  assert.deepEqual(createFrontendConfig(createFrontendEnv({})), {
    apiGatewayBaseUrl: defaultApiGatewayBaseUrl,
    dummyAuthLoginShortcutEnabled: false,
  })
})

test('frontend env config reads only the Vite-exposed API Gateway base URL', () => {
  const config = createFrontendConfig(
    createFrontendEnv({
      API_GATEWAY_BASE_URL: 'http://unprefixed-api-gateway.test',
      VITE_API_GATEWAY_BASE_URL: viteApiGatewayBaseUrl,
      VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled',
    }),
  )

  assert.deepEqual(config, {
    apiGatewayBaseUrl: viteApiGatewayBaseUrl,
    dummyAuthLoginShortcutEnabled: true,
  })
})

test('Frontend API Adapter uses the configured API Gateway base URL', async () => {
  let requestedUrl = ''
  const api = createFrontendApi({
    baseUrl: viteApiGatewayBaseUrl,
    async fetch(request) {
      requestedUrl = request.url

      return Response.json({ json: gatewayStatus })
    },
  })

  assert.deepEqual(await api.getGatewayStatus(), gatewayStatus)
  assert.equal(requestedUrl, `${viteApiGatewayBaseUrl}/rpc/v1/gateway/status`)
})

test('frontend env contract rejects an invalid API Gateway base URL', () => {
  assert.throws(() => createFrontendEnv({ VITE_API_GATEWAY_BASE_URL: 'not-a-url' }), /Invalid environment variables/)
})
