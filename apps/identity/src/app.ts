import {
  createDummyIdentityTokenCodec,
  defaultInternalServiceAuthSecret,
  handleInstrumentedOrpcServerRequest,
  type IdentityTokenSigner,
  identityRpcMountPath,
  orpcProcedureFromRequest,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { type IdentityModeConfig, resolveIdentityModeConfig } from './identity-mode-config'
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
  env?: NodeJS.ProcessEnv
  internalServiceAuthSecret?: string
  serviceName?: string
  tokenSigner?: IdentityTokenSigner
}

const createAuthProviderForMode = ({ authProvider }: IdentityModeConfig) => {
  if (authProvider === 'dummy') {
    return createDevelopmentAuthProviderAdapter()
  }

  throw new Error('IDENTITY_AUTH_PROVIDER=better-auth is not implemented yet')
}

const createTokenSignerForMode = ({ tokenCodec }: IdentityModeConfig) => {
  if (tokenCodec === 'dummy') {
    return createDummyIdentityTokenCodec()
  }

  throw new Error('IDENTITY_TOKEN_CODEC=jwt-jws is not implemented yet')
}

export const createIdentityApp = ({
  authProvider,
  env = process.env,
  internalServiceAuthSecret = env.IDENTITY_INTERNAL_SERVICE_AUTH_SECRET ?? defaultInternalServiceAuthSecret,
  serviceName = 'identity',
  tokenSigner,
}: IdentityAppOptions = {}) => {
  const identityModeConfig = resolveIdentityModeConfig(env)
  const resolvedAuthProvider = authProvider ?? createAuthProviderForMode(identityModeConfig)
  const resolvedTokenSigner = tokenSigner ?? createTokenSignerForMode(identityModeConfig)
  const app = new Hono()
  const identity = createIdentityUseCases({
    authProvider: resolvedAuthProvider,
    tokenSigner: resolvedTokenSigner,
  })
  const handler = new RPCHandler(createIdentityRouter(identity))

  app.get('/health', context =>
    context.json({
      identity: {
        authProvider: identityModeConfig.authProvider,
        tokenCodec: identityModeConfig.tokenCodec,
      },
      service: 'identity',
      message: 'identity service is running',
    }),
  )
  app.use(`${identityRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutIdentityRpcMountPath(context.req.raw)
    const { matched, response } = await handleInstrumentedOrpcServerRequest({
      handle: () => handler.handle(request, { context: { internalServiceAuthSecret, request } }),
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
