import { serve } from '@hono/node-server'
import { createIdentityApp } from './app'
import { createEmbeddedDevelopmentAuthProviderAdapter } from './embedded-development-auth-provider-adapter'

const port = Number(process.env.PORT ?? 3002)
const authProvider = createEmbeddedDevelopmentAuthProviderAdapter({
  databasePath: process.env.IDENTITY_DATABASE_PATH ?? '.data/identity/identity.sqlite',
})
const closeAuthProvider = () => authProvider.close()

serve({ fetch: createIdentityApp({ authProvider }).fetch, port }, info => {
  console.log(`Identity Service listening on http://localhost:${info.port}`)
})

process.on('exit', closeAuthProvider)
