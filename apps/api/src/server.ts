import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createApiGatewayApp } from './app'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)

await configureLocalTelemetry()

serve({
  port,
  fetch: createApiGatewayApp().fetch,
})

console.log(`API Gateway listening on http://localhost:${port}`)
