import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createIdentityApp } from './app'
import { createEmbeddedDevelopmentAuthProviderAdapter } from './embedded-development-auth-provider-adapter'
import { resolveIdentityModeConfig } from './identity-mode-config'

const port = Number(process.env.PORT ?? 3002)
const identityModeConfig = resolveIdentityModeConfig()
const authProvider =
  identityModeConfig.authProvider === 'dummy'
    ? createEmbeddedDevelopmentAuthProviderAdapter({
        databasePath: process.env.IDENTITY_DATABASE_PATH ?? '.data/identity/identity.sqlite',
        seedDemoAccounts:
          process.env.MEGIDDO_AUTH_PROFILE === 'local-dummy' ||
          process.env.IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS === 'enabled',
      })
    : undefined
const closeAuthProvider = () => authProvider?.close()

await configureLocalTelemetry()

serve({ fetch: createIdentityApp({ authProvider }).fetch, port }, info => {
  console.log(`Identity Service listening on http://localhost:${info.port}`)
})

process.on('exit', closeAuthProvider)
