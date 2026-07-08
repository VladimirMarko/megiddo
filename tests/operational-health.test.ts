import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp } from '@megiddo/api'
import {
  apiGatewayContractV1,
  identityContractV1,
  identityOperationalHealthV1,
  OperationalHealthResourceSchemaV1,
  todoContractV1,
  todoOperationalHealthV1,
} from '@megiddo/contracts'
import { createIdentityApp } from '@megiddo/identity'
import { createDummyIdentityTokenCodec } from '@megiddo/platform'
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
    createApp: () =>
      createApiGatewayApp({
        identityClient: createHealthyIdentityClient(),
        todoClient: createHealthyTodoClient(),
      }),
    expectedHealth: { service: 'api-gateway', status: 'ready' },
    name: 'API Gateway',
  },
  {
    createApp: () => createTodoApp({ tokenVerifier: createDummyIdentityTokenCodec() }),
    expectedHealth: { service: 'todo', status: 'ready' },
    name: 'Todo',
  },
  {
    createApp: createIdentityApp,
    expectedHealth: { service: 'identity', status: 'ready' },
    name: 'Identity',
  },
] as const

const createHealthyIdentityClient = () => ({
  async getOperationalHealth() {
    return identityOperationalHealthV1
  },
  async getAuthCapabilities() {
    throw new Error('getAuthCapabilities should not be called')
  },
  async createBrowserSession() {
    throw new Error('createBrowserSession should not be called')
  },
  async createBrowserSessionForSignUp() {
    throw new Error('createBrowserSessionForSignUp should not be called')
  },
  async resolveBrowserSession() {
    throw new Error('resolveBrowserSession should not be called')
  },
  async deleteBrowserSession() {
    throw new Error('deleteBrowserSession should not be called')
  },
  async issueDevelopmentIdentityToken() {
    throw new Error('issueDevelopmentIdentityToken should not be called')
  },
  async issueBrowserSessionIdentityToken() {
    throw new Error('issueBrowserSessionIdentityToken should not be called')
  },
})

const createHealthyTodoClient = () => ({
  async getOperationalHealth() {
    return todoOperationalHealthV1
  },
  async listTodos() {
    throw new Error('listTodos should not be called')
  },
  async createTodo() {
    throw new Error('createTodo should not be called')
  },
  async completeTodo() {
    throw new Error('completeTodo should not be called')
  },
  async reopenTodo() {
    throw new Error('reopenTodo should not be called')
  },
  async renameTodo() {
    throw new Error('renameTodo should not be called')
  },
})

test('current service contracts expose the shared operational health procedure', () => {
  assert.equal(typeof apiGatewayContractV1.v1.operational.health, 'object')
  assert.equal(typeof todoContractV1.v1.operational.health, 'object')
  assert.equal(typeof identityContractV1.v1.operational.health, 'object')
})

test('API Gateway HTTP health verifies private Identity and Todo connectivity', async () => {
  const calls: string[] = []
  const app = createApiGatewayApp({
    identityClient: {
      ...createHealthyIdentityClient(),
      async getOperationalHealth() {
        calls.push('identity.health')
        return identityOperationalHealthV1
      },
    },
    todoClient: {
      ...createHealthyTodoClient(),
      async getOperationalHealth() {
        calls.push('todo.health')
        return todoOperationalHealthV1
      },
    },
  })

  const response = await app.request('/health')

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { service: 'api-gateway', status: 'ready' })
  assert.deepEqual(calls.sort(), ['identity.health', 'todo.health'])
})

test('API Gateway HTTP health fails closed when private service health is unavailable', async () => {
  const app = createApiGatewayApp({
    identityClient: {
      ...createHealthyIdentityClient(),
      async getOperationalHealth() {
        return { reasons: ['database unavailable'], service: 'identity', status: 'broken' }
      },
    },
    todoClient: {
      ...createHealthyTodoClient(),
    },
  })

  const response = await app.request('/health')

  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), {
    reasons: ['identity health returned broken: database unavailable'],
    service: 'api-gateway',
    status: 'degraded',
  })
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
