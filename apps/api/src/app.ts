import { gatewayStatus } from '@megiddo/contracts'
import {
  apiGatewayRpcMountPath,
  handleInstrumentedOrpcServerRequest,
  orpcProcedureFromRequest,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { type ApiGatewayServiceConfig, createApiGatewayServiceConfig } from './config-builder'
import { createApiGatewayEnv } from './env-contract'
import { createIdentityServiceClient, type IdentityServiceClient } from './identity-service-client'
import { createApiGatewayRouter } from './router'
import { createTodoServiceClient, type TodoServiceClient } from './todo-service-client'

const requestWithoutApiGatewayRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(apiGatewayRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface ApiGatewayAppOptions {
  config?: ApiGatewayServiceConfig
  identityClient?: IdentityServiceClient
  serviceName?: string
  todoClient?: TodoServiceClient
}

export const createApiGatewayApp = ({
  config = createApiGatewayServiceConfig(createApiGatewayEnv({})),
  identityClient = createIdentityServiceClient({
    baseUrl: config.identityServiceUrl,
    internalServiceAuthSecret: config.identityInternalServiceAuthSecret,
  }),
  serviceName = 'api-gateway',
  todoClient = createTodoServiceClient({ baseUrl: config.todoServiceUrl }),
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
