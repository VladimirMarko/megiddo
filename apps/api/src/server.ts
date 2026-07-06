import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createApiGatewayApp } from './app'
import { createApiGatewayServiceConfig } from './config-builder'
import { createApiGatewayEnv } from './env-contract'

const env = createApiGatewayEnv(process.env)
const config = createApiGatewayServiceConfig(env)
const apiGatewayApp = createApiGatewayApp({ config })

await configureLocalTelemetry()

serve({
  port: config.port,
  fetch: apiGatewayApp.fetch,
})

console.log(`API Gateway listening on http://localhost:${config.port}`)
