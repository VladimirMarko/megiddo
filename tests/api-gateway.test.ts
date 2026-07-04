import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createApiGatewayApp,
  createIdentityServiceClient,
  createTodoServiceClient,
  type TodoServiceClient,
} from '@megiddo/api'
import { apiGatewayContractV1, gatewayStatus, type TodoResourceV1 } from '@megiddo/contracts'
import { createIdentityApp } from '@megiddo/identity'
import { createDevelopmentIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'

const postRpc = (app: ReturnType<typeof createApiGatewayApp>, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

test('contracts package exports the explicit API Gateway v1 contract surface', () => {
  assert.equal(typeof apiGatewayContractV1.v1.gateway.status, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.todos.list, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.todos.create, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.todos.complete, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.todos.reopen, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.todos.rename, 'object')
})

test('API Gateway exposes the v1 status procedure through its Hono app', async () => {
  const app = createApiGatewayApp()
  const response = await postRpc(app, '/rpc/v1/gateway/status')

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { json: gatewayStatus })
})

test('API Gateway v1 status procedure rejects invalid input', async () => {
  const app = createApiGatewayApp()
  const response = await postRpc(app, '/rpc/v1/gateway/status', { unexpected: true })

  assert.equal(response.status, 400)
})

test('API Gateway composes frontend-shaped todo procedures through a Todo client port', async () => {
  const calls: string[] = []
  const createdTodo: TodoResourceV1 = { id: 'todo-from-fake', title: 'Compose through Gateway', completed: false }
  const completedTodo: TodoResourceV1 = { ...createdTodo, completed: true }
  const identityClient = {
    async issueDevelopmentIdentityToken() {
      return { identityToken: 'fake-token', user: { id: 'dev:viewer' } }
    },
  }
  const todoClient: TodoServiceClient = {
    async listTodos(input) {
      calls.push('listTodos')
      assert.equal(input.identityToken, 'fake-token')
      return [completedTodo]
    },
    async createTodo(input) {
      calls.push(`createTodo:${input.title}`)
      return createdTodo
    },
    async completeTodo(input) {
      calls.push(`completeTodo:${input.id}`)
      return completedTodo
    },
    async reopenTodo(input) {
      calls.push(`reopenTodo:${input.id}`)
      return { ...createdTodo, completed: false }
    },
    async renameTodo(input) {
      calls.push(`renameTodo:${input.id}:${input.title}`)
      return { ...createdTodo, title: input.title }
    },
  }
  const app = createApiGatewayApp({ identityClient, todoClient })

  const createResponse = await postRpc(app, '/rpc/v1/viewer/todos/create', { title: 'Compose through Gateway' })
  const completeResponse = await postRpc(app, '/rpc/v1/viewer/todos/complete', { id: createdTodo.id })
  const reopenResponse = await postRpc(app, '/rpc/v1/viewer/todos/reopen', { id: createdTodo.id })
  const renameResponse = await postRpc(app, '/rpc/v1/viewer/todos/rename', {
    id: createdTodo.id,
    title: 'Renamed through Gateway',
  })
  const listResponse = await postRpc(app, '/rpc/v1/viewer/todos/list')

  assert.equal(createResponse.status, 200)
  assert.equal(completeResponse.status, 200)
  assert.equal(reopenResponse.status, 200)
  assert.equal(renameResponse.status, 200)
  assert.equal(listResponse.status, 200)
  assert.deepEqual(await createResponse.json(), { json: createdTodo })
  assert.deepEqual(await completeResponse.json(), { json: completedTodo })
  assert.deepEqual(await reopenResponse.json(), { json: createdTodo })
  assert.deepEqual(await renameResponse.json(), { json: { ...createdTodo, title: 'Renamed through Gateway' } })
  assert.deepEqual(await listResponse.json(), { json: [completedTodo] })
  assert.deepEqual(calls, [
    'createTodo:Compose through Gateway',
    'completeTodo:todo-from-fake',
    'reopenTodo:todo-from-fake',
    'renameTodo:todo-from-fake:Renamed through Gateway',
    'listTodos',
  ])
})

test('API Gateway production Todo client reaches Todo over the Todo oRPC contract', async () => {
  const codec = createDevelopmentIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const apiApp = createApiGatewayApp({ identityClient, todoClient })

  const createResponse = await postRpc(apiApp, '/rpc/v1/viewer/todos/create', { title: 'Cross service Todo' })
  assert.equal(createResponse.status, 200)

  const created = (await createResponse.json()) as { json: TodoResourceV1 }
  assert.match(created.json.id, /^todo-/)
  assert.deepEqual(created.json, { id: created.json.id, title: 'Cross service Todo', completed: false })

  const listResponse = await postRpc(apiApp, '/rpc/v1/viewer/todos/list')

  assert.equal(listResponse.status, 200)
  assert.deepEqual(await listResponse.json(), { json: [created.json] })
})
