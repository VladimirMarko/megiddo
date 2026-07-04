import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInMemoryTodoRepository, createTodoUseCases } from '@megiddo/todo'

test('Todo use cases create and list ownerless development todos through in-memory persistence', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const first = await todos.create({ title: 'Write the tracer bullet' })
  const second = await todos.create({ title: 'Prove the use cases' })

  assert.deepEqual(await todos.list(), [
    { id: first.id, title: 'Write the tracer bullet', completed: false },
    { id: second.id, title: 'Prove the use cases', completed: false },
  ])
})

test('Todo use cases complete, reopen, and rename todos', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const todo = await todos.create({ title: 'Draft service boundary' })
  assert.deepEqual(await todos.complete({ id: todo.id }), {
    id: todo.id,
    title: 'Draft service boundary',
    completed: true,
  })
  assert.deepEqual(await todos.reopen({ id: todo.id }), {
    id: todo.id,
    title: 'Draft service boundary',
    completed: false,
  })
  assert.deepEqual(await todos.rename({ id: todo.id, title: 'Finalize service boundary' }), {
    id: todo.id,
    title: 'Finalize service boundary',
    completed: false,
  })
})

test('Todo use cases reject renaming a completed todo until it is reopened', async () => {
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })

  const todo = await todos.create({ title: 'Cannot rename while complete' })
  await todos.complete({ id: todo.id })

  await assert.rejects(() => todos.rename({ id: todo.id, title: 'Blocked rename' }), /reopen/i)

  await todos.reopen({ id: todo.id })
  assert.equal((await todos.rename({ id: todo.id, title: 'Allowed rename' })).title, 'Allowed rename')
})
