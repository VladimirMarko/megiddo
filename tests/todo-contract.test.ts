import assert from 'node:assert/strict'
import { test } from 'node:test'
import { type TodoResourceV1, todoContractV1 } from '@megiddo/contracts'
import { createJwtJwsIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'

interface TodoResponseBody {
  json: TodoResourceV1
}

test('contracts package exports the explicit Todo v1 contract surface', () => {
  assert.equal(typeof todoContractV1.v1.todos.list, 'object')
  assert.equal(typeof todoContractV1.v1.todos.create, 'object')
  assert.equal(typeof todoContractV1.v1.todos.complete, 'object')
  assert.equal(typeof todoContractV1.v1.todos.reopen, 'object')
  assert.equal(typeof todoContractV1.v1.todos.rename, 'object')
})

test('Todo Service exposes representative v1 todo behavior through its Hono app', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityToken = await codec.issueIdentityToken({ audience: { service: 'todo' }, subject: 'dev:viewer' })
  const app = createTodoApp({ tokenVerifier: codec })

  const createResponse = await app.request('/rpc/v1/todos/create', {
    body: JSON.stringify({ json: { identityToken, title: 'Ship Todo Service' } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(createResponse.status, 200)
  const created = (await createResponse.json()) as TodoResponseBody
  assert.match(created.json.id, /^todo-/)
  assert.deepEqual(created.json, { id: created.json.id, title: 'Ship Todo Service', completed: false })

  const listResponse = await app.request('/rpc/v1/todos/list', {
    body: JSON.stringify({ json: { identityToken } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(listResponse.status, 200)
  assert.deepEqual(await listResponse.json(), { json: [created.json] })
})
