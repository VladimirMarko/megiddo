import {
  handleInstrumentedOrpcServerRequest,
  type IdentityTokenSigner,
  identityRpcMountPath,
  orpcProcedureFromRequest,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createIdentityServiceConfig, type IdentityServiceConfig } from './config-builder'
import { createEmbeddedBetterAuthProviderAdapter } from './embedded-better-auth-provider-adapter'
import { createIdentityEnv } from './env-contract'
import type { AuthProviderAdapter } from './identity-use-cases'
import { createDevelopmentAuthProviderAdapter, createIdentityUseCases } from './identity-use-cases'
import { createIdentityTokenSigner } from './infrastructure'
import { createIdentityRouter } from './router'

const requestWithoutIdentityRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(identityRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface IdentityAppOptions {
  authProvider?: AuthProviderAdapter
  internalServiceAuthSecret?: string
  serviceConfig?: IdentityServiceConfig
  serviceName?: string
  tokenSigner?: IdentityTokenSigner
}

const defaultIdentityServiceConfig = () => createIdentityServiceConfig(createIdentityEnv({}))

const createAuthProviderForConfig = (config: IdentityServiceConfig) => {
  if (config.authProvider === 'dummy') {
    return createDevelopmentAuthProviderAdapter()
  }

  return createEmbeddedBetterAuthProviderAdapter({
    baseURL: config.betterAuthBaseUrl,
    databasePath: config.betterAuthDatabasePath,
    secret: config.betterAuthSecret,
  })
}

export const createIdentityApp = ({
  authProvider,
  internalServiceAuthSecret,
  serviceConfig = defaultIdentityServiceConfig(),
  serviceName = 'identity',
  tokenSigner,
}: IdentityAppOptions = {}) => {
  const resolvedAuthProvider = authProvider ?? createAuthProviderForConfig(serviceConfig)
  const resolvedInternalServiceAuthSecret = internalServiceAuthSecret ?? serviceConfig.internalServiceAuthSecret
  const resolvedTokenSigner = tokenSigner ?? createIdentityTokenSigner(serviceConfig)
  const app = new Hono()
  const identity = createIdentityUseCases({
    authProvider: resolvedAuthProvider,
    tokenSigner: resolvedTokenSigner,
  })
  const handler = new RPCHandler(createIdentityRouter(identity))

  app.get('/health', context =>
    context.json({
      identity: {
        authProvider: serviceConfig.authProvider,
        tokenCodec: serviceConfig.tokenCodec,
      },
      service: 'identity',
      message: 'identity service is running',
    }),
  )
  app.use(`${identityRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutIdentityRpcMountPath(context.req.raw)
    const { matched, response } = await handleInstrumentedOrpcServerRequest({
      handle: () =>
        handler.handle(request, { context: { internalServiceAuthSecret: resolvedInternalServiceAuthSecret, request } }),
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
