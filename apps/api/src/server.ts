import { serve } from '@hono/node-server'
import { createApiGatewayApp } from './app'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)

serve({
  port,
  fetch: createApiGatewayApp().fetch,
})

console.log(`API Gateway listening on http://localhost:${port}`)
