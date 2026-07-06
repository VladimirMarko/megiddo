import {
  createDummyIdentityTokenCodec,
  createJwtJwsIdentityTokenCodec,
  handleInstrumentedOrpcServerRequest,
  type IdentityTokenVerifier,
  orpcProcedureFromRequest,
  todoRpcMountPath,
} from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createInMemoryTodoRepository } from './in-memory-todo-repository'
import { createTodoRouter } from './router'
import { createTodoUseCases, type TodoRepository } from './todo-use-cases'

const requestWithoutTodoRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(todoRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface TodoAppOptions {
  env?: NodeJS.ProcessEnv
  repository?: TodoRepository
  serviceName?: string
  tokenVerifier?: IdentityTokenVerifier
}

const createDefaultTokenVerifier = (env: NodeJS.ProcessEnv) => {
  if (
    env.IDENTITY_TOKEN_CODEC === 'dummy' ||
    (!env.IDENTITY_TOKEN_CODEC && env.MEGIDDO_AUTH_PROFILE === 'local-dummy')
  ) {
    return createDummyIdentityTokenCodec()
  }

  return createJwtJwsIdentityTokenCodec({ env })
}

export const createTodoApp = ({
  env = process.env,
  repository = createInMemoryTodoRepository(),
  serviceName = 'todo',
  tokenVerifier = createDefaultTokenVerifier(env),
}: TodoAppOptions = {}) => {
  const app = new Hono()
  const todos = createTodoUseCases({ repository })
  const handler = new RPCHandler(createTodoRouter(todos, tokenVerifier))

  app.get('/health', context => context.json({ service: 'todo', message: 'todo service is running' }))
  app.use(`${todoRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutTodoRpcMountPath(context.req.raw)
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
