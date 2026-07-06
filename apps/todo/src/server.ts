import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createTodoApp } from './app'
import { createTodoEnv, createTodoServiceConfig } from './env'
import { createTodoServiceInfrastructure } from './infrastructure'

const env = createTodoEnv(process.env)
const config = createTodoServiceConfig(env)
const infrastructure = createTodoServiceInfrastructure(config)
const closeInfrastructure = () => infrastructure.close()

await configureLocalTelemetry()

serve({
  port: config.port,
  fetch: createTodoApp({ repository: infrastructure.repository, tokenVerifier: infrastructure.tokenVerifier }).fetch,
})

process.on('exit', closeInfrastructure)

console.log(`Todo Service listening on http://localhost:${config.port}`)
