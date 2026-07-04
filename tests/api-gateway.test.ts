import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp } from '@megiddo/api'
import { apiGatewayContractV1, gatewayStatus } from '@megiddo/contracts'

test('contracts package exports the explicit API Gateway v1 Contract Surface', () => {
  assert.equal(typeof apiGatewayContractV1.v1.gateway.status, 'object')
})

test('API Gateway exposes the v1 status procedure through its Hono app', async () => {
  const app = createApiGatewayApp()
  const response = await app.request('/rpc/v1/gateway/status', {
    body: '{}',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { json: gatewayStatus })
})

test('API Gateway v1 status procedure rejects invalid input', async () => {
  const app = createApiGatewayApp()
  const response = await app.request('/rpc/v1/gateway/status', {
    body: JSON.stringify({ json: { unexpected: true } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(response.status, 400)
})
