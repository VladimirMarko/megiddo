import { gatewayStatus } from '@megiddo/contracts'
import {
  apiGatewayRpcMountPath,
  handleInstrumentedOrpcServerRequest,
  orpcProcedureFromRequest,
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

const requestWithoutApiGatewayRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(apiGatewayRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface ApiGatewayAppOptions {
  identityClient?: IdentityServiceClient
  serviceName?: string
  todoClient?: TodoServiceClient
}

export const createApiGatewayApp = ({
  identityClient = createIdentityServiceClient({ baseUrl: process.env.IDENTITY_SERVICE_URL }),
  serviceName = 'api-gateway',
  todoClient = createTodoServiceClient({ baseUrl: process.env.TODO_SERVICE_URL }),
}: ApiGatewayAppOptions = {}) => {
  const app = new Hono()
  const handler = new RPCHandler(createApiGatewayRouter({ identityClient, todoClient }))

  app.get('/health', context => context.json(gatewayStatus))
  app.use(`${apiGatewayRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutApiGatewayRpcMountPath(context.req.raw)
    const responseHeaders = new Headers()
    const { matched, response } = await handleInstrumentedOrpcServerRequest({
      handle: () => handler.handle(request, { context: { request, responseHeaders } }),
      procedure: orpcProcedureFromRequest(request),
      request,
      serviceName,
    })

    if (matched) {
      responseHeaders.forEach((value, key) => {
        response.headers.append(key, value)
      })

      return response
    }

    return next()
  })

  return app
}
