import { serve } from '@hono/node-server'
import { createTodoApp } from './app'
import { createEmbeddedTodoRepository } from './embedded-todo-repository'

const port = Number.parseInt(process.env.PORT ?? '3001', 10)
const repository = createEmbeddedTodoRepository({
  databasePath: process.env.TODO_DATABASE_PATH ?? '.data/todo/todo.sqlite',
})

serve({
  port,
  fetch: createTodoApp({ repository }).fetch,
})

process.on('exit', () => repository.close())

console.log(`Todo Service listening on http://localhost:${port}`)
