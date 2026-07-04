import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp } from '@megiddo/api'
import { gatewayStatus } from '@megiddo/contracts'

test('API Gateway exposes the status procedure through its Hono app', async () => {
  const app = createApiGatewayApp()
  const response = await app.request('/rpc/gateway/status', {
    body: '{}',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { json: gatewayStatus })
})
