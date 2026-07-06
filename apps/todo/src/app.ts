import {
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
  repository?: TodoRepository
  serviceName?: string
  tokenVerifier: IdentityTokenVerifier
}

export const createTodoApp = ({
  repository = createInMemoryTodoRepository(),
  serviceName = 'todo',
  tokenVerifier,
}: TodoAppOptions) => {
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
