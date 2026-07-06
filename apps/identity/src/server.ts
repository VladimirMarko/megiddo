import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createIdentityApp } from './app'
import { createIdentityServiceConfig } from './config-builder'
import { createIdentityEnv } from './env-contract'
import { createIdentityServiceInfrastructure } from './infrastructure'

const env = createIdentityEnv(process.env)
const config = createIdentityServiceConfig(env)
const infrastructure = createIdentityServiceInfrastructure(config)
const identityApp = createIdentityApp({
  authProvider: infrastructure.authProvider,
  serviceConfig: config,
  tokenSigner: infrastructure.tokenSigner,
})
const closeInfrastructure = () => infrastructure.close()

await configureLocalTelemetry()

serve({ fetch: identityApp.fetch, port: config.port }, info => {
  console.log(`Identity Service listening on http://localhost:${info.port}`)
})

process.on('exit', closeInfrastructure)
