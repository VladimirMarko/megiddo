import { gatewayStatus } from '@megiddo/contracts'
import {
  apiGatewayRpcMountPath,
  createDevelopmentIdentityTokenCodec,
  type IdentityTokenVerifier,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createIdentityServiceClient, type IdentityServiceClient } from './identity-service-client'
import { createApiGatewayRouter } from './router'
import { createTodoServiceClient, type TodoServiceClient } from './todo-service-client'

export type { IdentityServiceClient } from './identity-service-client'
export { createIdentityServiceClient } from './identity-service-client'
export type { TodoServiceClient } from './todo-service-client'
export { createTodoServiceClient } from './todo-service-client'

interface ApiGatewayAppOptions {
  identityClient?: IdentityServiceClient
  tokenVerifier?: IdentityTokenVerifier
  todoClient?: TodoServiceClient
}

export const createApiGatewayApp = ({
  identityClient = createIdentityServiceClient({ baseUrl: process.env.IDENTITY_SERVICE_URL }),
  tokenVerifier = createDevelopmentIdentityTokenCodec(),
  todoClient = createTodoServiceClient({ baseUrl: process.env.TODO_SERVICE_URL }),
}: ApiGatewayAppOptions = {}) => {
  const app = new Hono()
  const handler = new RPCHandler(createApiGatewayRouter({ identityClient, todoClient, tokenVerifier }))

  app.get('/health', context => context.json(gatewayStatus))
  app.use(`${apiGatewayRpcMountPath}/*`, async (context, next) => {
    const url = new URL(context.req.raw.url)
    url.pathname = url.pathname.slice(apiGatewayRpcMountPath.length) || '/'

    const request = new Request(url, context.req.raw)
    const { matched, response } = await handler.handle(request, { context: { request } })

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
