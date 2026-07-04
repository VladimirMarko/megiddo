import { gatewayStatus } from '@megiddo/contracts'
import { apiGatewayRpcMountPath } from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createApiGatewayRouter } from './router'
import { createTodoServiceClient, type TodoServiceClient } from './todo-service-client'

export type { TodoServiceClient } from './todo-service-client'
export { createTodoServiceClient } from './todo-service-client'

interface ApiGatewayAppOptions {
  todoClient?: TodoServiceClient
}

export const createApiGatewayApp = ({
  todoClient = createTodoServiceClient({ baseUrl: process.env.TODO_SERVICE_URL }),
}: ApiGatewayAppOptions = {}) => {
  const app = new Hono()
  const handler = new RPCHandler(createApiGatewayRouter({ todoClient }))

  app.get('/health', context => context.json(gatewayStatus))
  app.use(`${apiGatewayRpcMountPath}/*`, async (context, next) => {
    const url = new URL(context.req.raw.url)
    url.pathname = url.pathname.slice(apiGatewayRpcMountPath.length) || '/'

    const request = new Request(url, context.req.raw)
    const { matched, response } = await handler.handle(request)

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
