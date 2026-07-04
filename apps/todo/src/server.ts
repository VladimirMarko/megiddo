import { serve } from '@hono/node-server'
import { createTodoApp } from './app'

const port = Number.parseInt(process.env.PORT ?? '3001', 10)

serve({
  port,
  fetch: createTodoApp().fetch,
})

console.log(`Todo Service listening on http://localhost:${port}`)
