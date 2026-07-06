import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createTodoApp } from './app'
import { createTodoEnv, createTodoServiceConfig } from './env'
import { createTodoServiceInfrastructure } from './infrastructure'

const env = createTodoEnv(process.env)
const config = createTodoServiceConfig(env)
const infrastructure = createTodoServiceInfrastructure(config)
const todoApp = createTodoApp({
  repository: infrastructure.repository,
  tokenVerifier: infrastructure.tokenVerifier,
})
const closeInfrastructure = () => infrastructure.close()

await configureLocalTelemetry()

serve({
  port: config.port,
  fetch: todoApp.fetch,
})

process.on('exit', closeInfrastructure)

console.log(`Todo Service listening on http://localhost:${config.port}`)
