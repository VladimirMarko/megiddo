import { serve } from '@hono/node-server'
import { createIdentityApp } from './app'

const port = Number(process.env.PORT ?? 3002)

serve({ fetch: createIdentityApp().fetch, port }, info => {
  console.log(`Identity Service listening on http://localhost:${info.port}`)
})
