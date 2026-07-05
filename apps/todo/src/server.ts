import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createTodoApp } from './app'
import { createEmbeddedTodoRepository } from './embedded-todo-repository'

const port = Number.parseInt(process.env.PORT ?? '3001', 10)
const repository = createEmbeddedTodoRepository({
  databasePath: process.env.TODO_DATABASE_PATH ?? '.data/todo/todo.sqlite',
})
const closeRepository = () => repository.close()

await configureLocalTelemetry()

serve({
  port,
  fetch: createTodoApp({ repository }).fetch,
})

process.on('exit', closeRepository)

console.log(`Todo Service listening on http://localhost:${port}`)
