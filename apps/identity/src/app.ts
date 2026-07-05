import {
  createDevelopmentIdentityTokenCodec,
  handleInstrumentedOrpcServerRequest,
  type IdentityTokenSigner,
  identityRpcMountPath,
  orpcProcedureFromRequest,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import type { AuthProviderAdapter } from './identity-use-cases'
import { createDevelopmentAuthProviderAdapter, createIdentityUseCases } from './identity-use-cases'
import { createIdentityRouter } from './router'

const requestWithoutIdentityRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(identityRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface IdentityAppOptions {
  authProvider?: AuthProviderAdapter
  serviceName?: string
  tokenSigner?: IdentityTokenSigner
}

export const createIdentityApp = ({
  authProvider = createDevelopmentAuthProviderAdapter(),
  serviceName = 'identity',
  tokenSigner = createDevelopmentIdentityTokenCodec(),
}: IdentityAppOptions = {}) => {
  const app = new Hono()
  const identity = createIdentityUseCases({
    authProvider,
    tokenSigner,
  })
  const handler = new RPCHandler(createIdentityRouter(identity))

  app.get('/health', context => context.json({ service: 'identity', message: 'identity service is running' }))
  app.use(`${identityRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutIdentityRpcMountPath(context.req.raw)
    const { matched, response } = await handleInstrumentedOrpcServerRequest({
      handle: () => handler.handle(request),
      procedure: orpcProcedureFromRequest(request),
      request,
      serviceName,
    })

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
