import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp } from '@megiddo/api'
import {
  apiGatewayContractV1,
  identityContractV1,
  OperationalHealthResourceSchemaV1,
  todoContractV1,
} from '@megiddo/contracts'
import { createIdentityApp } from '@megiddo/identity'
import { createTodoApp } from '@megiddo/todo'

type TestApp = { request: (path: string, init?: RequestInit) => Promise<Response> }

const postRpc = (app: TestApp, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

test('operational health contract shape distinguishes ready and non-ready responses', () => {
  assert.deepEqual(OperationalHealthResourceSchemaV1.parse({ service: 'api-gateway', status: 'ready' }), {
    service: 'api-gateway',
    status: 'ready',
  })
  assert.deepEqual(
    OperationalHealthResourceSchemaV1.parse({ reasons: ['database unavailable'], service: 'todo', status: 'broken' }),
    { reasons: ['database unavailable'], service: 'todo', status: 'broken' },
  )
  assert.equal(
    OperationalHealthResourceSchemaV1.safeParse({ reasons: [], service: 'todo', status: 'starting' }).success,
    false,
  )
  assert.equal(
    OperationalHealthResourceSchemaV1.safeParse({ reasons: ['unexpected'], service: 'identity', status: 'ready' })
      .success,
    false,
  )
})

const operationalHealthServices = [
  {
    createApp: createApiGatewayApp,
    expectedHealth: { service: 'api-gateway', status: 'ready' },
    name: 'API Gateway',
  },
  {
    createApp: createTodoApp,
    expectedHealth: { service: 'todo', status: 'ready' },
    name: 'Todo',
  },
  {
    createApp: createIdentityApp,
    expectedHealth: { service: 'identity', status: 'ready' },
    name: 'Identity',
  },
] as const

test('current service contracts expose the shared operational health procedure', () => {
  assert.equal(typeof apiGatewayContractV1.v1.operational.health, 'object')
  assert.equal(typeof todoContractV1.v1.operational.health, 'object')
  assert.equal(typeof identityContractV1.v1.operational.health, 'object')
})

for (const { createApp, expectedHealth, name } of operationalHealthServices) {
  test(`${name} exposes contract-defined operational health and keeps raw health`, async () => {
    const app = createApp()
    const contractResponse = await postRpc(app, '/rpc/v1/operational/health')
    const rawResponse = await app.request('/health')

    assert.equal(contractResponse.status, 200)
    assert.deepEqual(await contractResponse.json(), { json: expectedHealth })
    assert.equal(rawResponse.status, 200)
  })
}
