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
import { createJwtJwsIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'

const postRpc = (app: ReturnType<typeof createApiGatewayApp>, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

test('contracts package exports the explicit API Gateway v1 contract surface', () => {
  assert.equal(typeof apiGatewayContractV1.v1.gateway.status, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.session.capabilities, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.session.current, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.session.signIn, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.session.signUp, 'object')
  assert.equal(typeof apiGatewayContractV1.v1.viewer.session.signOut, 'object')
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
    async getAuthCapabilities() {
      return { signInMethods: [], signUpMethods: [] }
    },
    async createBrowserSession() {
      throw new Error('signIn should not be called')
    },
    async createBrowserSessionForSignUp() {
      throw new Error('signUp should not be called')
    },
    async resolveBrowserSession(input) {
      assert.equal(input.sessionId, 'browser-session')
      return { state: 'logged-in' as const, user: { id: 'dev:viewer' } }
    },
    async deleteBrowserSession() {
      throw new Error('deleteBrowserSession should not be called')
    },
    async issueDevelopmentIdentityToken(input) {
      assert.equal(input.subject, 'dev:viewer')
      return { identityToken: 'fake-token', user: { id: 'dev:viewer' } }
    },
    async issueBrowserSessionIdentityToken(input) {
      assert.equal(input.sessionId, 'browser-session')
      assert.equal(input.audience.service, 'todo')
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

  const createResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/todos/create',
    'megiddo_session=browser-session',
    {
      title: 'Compose through Gateway',
    },
  )
  const completeResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/todos/complete',
    'megiddo_session=browser-session',
    {
      id: createdTodo.id,
    },
  )
  const reopenResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/todos/reopen',
    'megiddo_session=browser-session',
    {
      id: createdTodo.id,
    },
  )
  const renameResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/todos/rename',
    'megiddo_session=browser-session',
    {
      id: createdTodo.id,
      title: 'Renamed through Gateway',
    },
  )
  const listResponse = await postRpcWithCookie(app, '/rpc/v1/viewer/todos/list', 'megiddo_session=browser-session')

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

const postRpcWithCookie = (app: ReturnType<typeof createApiGatewayApp>, path: string, cookie: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json', cookie },
    method: 'POST',
  })

test('API Gateway browser auth uses Identity-owned sessions without returning service tokens', async () => {
  const calls: string[] = []
  const identityClient = {
    async getAuthCapabilities() {
      return { signInMethods: ['dummy' as const], signUpMethods: ['dummy' as const] }
    },
    async createBrowserSession(input) {
      calls.push(`signIn:${input.principalId}`)
      return { browserSession: { id: 'session-alice' }, user: { id: 'dummy:alice' } }
    },
    async createBrowserSessionForSignUp(input) {
      calls.push(`signUp:${input.displayName}`)
      return {
        browserSession: { id: 'session-charlie' },
        user: { displayName: input.displayName, id: 'dummy:charlie' },
      }
    },
    async resolveBrowserSession(input) {
      calls.push(`current:${input.sessionId}`)
      return input.sessionId === 'session-alice'
        ? { state: 'logged-in' as const, user: { id: 'dummy:alice' } }
        : { state: 'expired' as const }
    },
    async deleteBrowserSession(input) {
      calls.push(`signOut:${input.sessionId}`)
    },
    async issueDevelopmentIdentityToken(input) {
      calls.push(`issueTodo:${input.subject}:${input.audience.service}`)
      return { identityToken: 'todo-token-for-alice', user: { id: input.subject ?? 'missing' } }
    },
    async issueBrowserSessionIdentityToken(input) {
      calls.push(`issueTodoForSession:${input.sessionId}:${input.audience.service}`)
      return { identityToken: 'todo-token-for-alice', user: { id: 'dummy:alice' } }
    },
  }
  const todoClient: TodoServiceClient = {
    async listTodos(input) {
      assert.equal(input.identityToken, 'todo-token-for-alice')
      return []
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
  }
  const app = createApiGatewayApp({ identityClient, todoClient })

  const signInResponse = await postRpc(app, '/rpc/v1/viewer/session/signIn', {
    method: 'dummy',
    principalId: 'dummy:alice',
  })
  assert.equal(signInResponse.status, 200)
  assert.deepEqual(await signInResponse.json(), { json: { state: 'logged-in', user: { id: 'dummy:alice' } } })
  assert.match(signInResponse.headers.get('set-cookie') ?? '', /^megiddo_session=session-alice;/)

  const currentResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/session/current',
    'megiddo_session=session-alice',
  )
  assert.equal(currentResponse.status, 200)
  assert.deepEqual(await currentResponse.json(), { json: { state: 'logged-in', user: { id: 'dummy:alice' } } })

  const listResponse = await postRpcWithCookie(app, '/rpc/v1/viewer/todos/list', 'megiddo_session=session-alice')
  assert.equal(listResponse.status, 200)
  assert.deepEqual(await listResponse.json(), { json: [] })

  const signOutResponse = await postRpcWithCookie(
    app,
    '/rpc/v1/viewer/session/signOut',
    'megiddo_session=session-alice',
  )
  assert.equal(signOutResponse.status, 200)
  assert.deepEqual(await signOutResponse.json(), { json: { state: 'logged-out' } })
  assert.match(signOutResponse.headers.get('set-cookie') ?? '', /^megiddo_session=;/)
  assert.deepEqual(calls, [
    'signIn:dummy:alice',
    'current:session-alice',
    'issueTodoForSession:session-alice:todo',
    'signOut:session-alice',
  ])
})

test('API Gateway production Todo client reaches Todo over the Todo oRPC contract', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
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
  const capabilitiesResponse = await postRpc(apiApp, '/rpc/v1/viewer/session/capabilities')
  assert.equal(capabilitiesResponse.status, 200)
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

  const signInResponse = await postRpc(apiApp, '/rpc/v1/viewer/session/signIn', {
    method: 'dummy',
    principalId: 'dummy:alice',
  })
  assert.equal(signInResponse.status, 200)
  assert.deepEqual(await signInResponse.json(), {
    json: { state: 'logged-in', user: { displayName: 'Alice', id: 'dummy:alice' } },
  })
  const signInCookie = signInResponse.headers.get('set-cookie')
  assert.ok(signInCookie)
  const sessionCookie = signInCookie.split(';')[0]

  const currentResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/session/current', sessionCookie)
  assert.equal(currentResponse.status, 200)
  assert.deepEqual(await currentResponse.json(), {
    json: { state: 'logged-in', user: { displayName: 'Alice', id: 'dummy:alice' } },
  })

  const createResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/create', sessionCookie, {
    title: 'Cross service Todo',
  })
  assert.equal(createResponse.status, 200)

  const created = (await createResponse.json()) as { json: TodoResourceV1 }
  assert.match(created.json.id, /^todo-/)
  assert.deepEqual(created.json, { id: created.json.id, title: 'Cross service Todo', completed: false })

  const listResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/list', sessionCookie)

  assert.equal(listResponse.status, 200)
  assert.deepEqual(await listResponse.json(), { json: [created.json] })

  const bobSignInResponse = await postRpc(apiApp, '/rpc/v1/viewer/session/signIn', {
    method: 'dummy',
    principalId: 'dummy:bob',
  })
  assert.equal(bobSignInResponse.status, 200)
  const bobSignInCookie = bobSignInResponse.headers.get('set-cookie')
  assert.ok(bobSignInCookie)
  const bobSessionCookie = bobSignInCookie.split(';')[0]

  const bobListResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/list', bobSessionCookie)
  assert.equal(bobListResponse.status, 200)
  assert.deepEqual(await bobListResponse.json(), { json: [] })

  const bobCompleteAliceTodoResponse = await postRpcWithCookie(
    apiApp,
    '/rpc/v1/viewer/todos/complete',
    bobSessionCookie,
    { id: created.json.id },
  )
  assert.equal(bobCompleteAliceTodoResponse.status, 500)

  const aliceListAfterBobResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/list', sessionCookie)
  assert.equal(aliceListAfterBobResponse.status, 200)
  assert.deepEqual(await aliceListAfterBobResponse.json(), { json: [created.json] })
})
