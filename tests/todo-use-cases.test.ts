import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInMemoryTodoRepository, createTodoUseCases } from '@megiddo/todo'

test('Todo use cases create and list todos for an explicit owner through in-memory persistence', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const first = await todos.create({ ownerId: 'user-1', title: 'Write the tracer bullet' })
  const second = await todos.create({ ownerId: 'user-1', title: 'Prove the use cases' })
  await todos.create({ ownerId: 'user-2', title: 'Hidden from user 1' })

  assert.deepEqual(await todos.list('user-1'), [
    { id: first.id, title: 'Write the tracer bullet', completed: false },
    { id: second.id, title: 'Prove the use cases', completed: false },
  ])
})

test('Todo use cases complete, reopen, and rename todos', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const todo = await todos.create({ ownerId: 'user-1', title: 'Draft service boundary' })
  assert.deepEqual(await todos.complete({ id: todo.id, ownerId: 'user-1' }), {
    id: todo.id,
    title: 'Draft service boundary',
    completed: true,
  })
  assert.deepEqual(await todos.reopen({ id: todo.id, ownerId: 'user-1' }), {
    id: todo.id,
    title: 'Draft service boundary',
    completed: false,
  })
  assert.deepEqual(await todos.rename({ id: todo.id, ownerId: 'user-1', title: 'Finalize service boundary' }), {
    id: todo.id,
    title: 'Finalize service boundary',
    completed: false,
  })
})

test('Todo use cases reject renaming a completed todo until it is reopened', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const todo = await todos.create({ ownerId: 'user-1', title: 'Cannot rename while complete' })
  await todos.complete({ id: todo.id, ownerId: 'user-1' })

  await assert.rejects(() => todos.rename({ id: todo.id, ownerId: 'user-1', title: 'Blocked rename' }), /reopen/i)

  await todos.reopen({ id: todo.id, ownerId: 'user-1' })
  assert.equal(
    (await todos.rename({ id: todo.id, ownerId: 'user-1', title: 'Allowed rename' })).title,
    'Allowed rename',
  )
})
