import assert from 'node:assert/strict'
import { test } from 'node:test'
import { todoContractV1 } from '@megiddo/contracts'
import { createTodoApp } from '@megiddo/todo'

test('contracts package exports the explicit Todo v1 contract surface', () => {
  assert.equal(typeof todoContractV1.v1.todos.list, 'object')
  assert.equal(typeof todoContractV1.v1.todos.create, 'object')
  assert.equal(typeof todoContractV1.v1.todos.complete, 'object')
  assert.equal(typeof todoContractV1.v1.todos.reopen, 'object')
  assert.equal(typeof todoContractV1.v1.todos.rename, 'object')
})

test('Todo Service exposes representative v1 todo behavior through its Hono app', async () => {
  const app = createTodoApp()

  const createResponse = await app.request('/rpc/v1/todos/create', {
    body: JSON.stringify({ json: { title: 'Ship Todo Service' } }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(createResponse.status, 200)
  const created = (await createResponse.json()) as { json: { id: string; title: string; completed: boolean } }
  assert.match(created.json.id, /^todo-/)
  assert.deepEqual(created.json, { id: created.json.id, title: 'Ship Todo Service', completed: false })

  const listResponse = await app.request('/rpc/v1/todos/list', {
    body: '{}',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  assert.equal(listResponse.status, 200)
  assert.deepEqual(await listResponse.json(), { json: [created.json] })
})
