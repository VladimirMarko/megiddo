import { gatewayStatus } from '@megiddo/contracts'
import { apiGatewayRpcMountPath } from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { apiGatewayRouter } from './router'

export const createApiGatewayApp = () => {
  const app = new Hono()
  const handler = new RPCHandler(apiGatewayRouter)

  app.get('/health', context => context.json(gatewayStatus))
  app.use(`${apiGatewayRpcMountPath}/*`, async (context, next) => {
    const url = new URL(context.req.raw.url)
    url.pathname = url.pathname.replace(apiGatewayRpcMountPath, '') || '/'
    const request = new Request(url, context.req.raw)
    const { matched, response } = await handler.handle(request)

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
