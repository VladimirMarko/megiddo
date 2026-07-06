import { serve } from '@hono/node-server'
import { configureLocalTelemetry } from '@megiddo/platform/local-telemetry'
import { createIdentityApp } from './app'
import { createEmbeddedBetterAuthProviderAdapter } from './embedded-better-auth-provider-adapter'
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
    : createEmbeddedBetterAuthProviderAdapter({
        baseURL: process.env.BETTER_AUTH_URL ?? process.env.IDENTITY_BETTER_AUTH_BASE_URL,
        databasePath: process.env.IDENTITY_BETTER_AUTH_DATABASE_PATH ?? '.data/identity/better-auth.sqlite',
      })
const closeAuthProvider = () => authProvider?.close()

await configureLocalTelemetry()

serve({ fetch: createIdentityApp({ authProvider }).fetch, port }, info => {
  console.log(`Identity Service listening on http://localhost:${info.port}`)
})

process.on('exit', closeAuthProvider)
