import { createDevelopmentIdentityTokenCodec, type IdentityTokenVerifier, todoRpcMountPath } from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createInMemoryTodoRepository } from './in-memory-todo-repository'
import { createTodoRouter } from './router'
import { createTodoUseCases } from './todo-use-cases'

const requestWithoutTodoRpcMountPath = (request: Request) => {
  const url = new URL(request.url)
  url.pathname = url.pathname.slice(todoRpcMountPath.length) || '/'

  return new Request(url, request)
}

interface TodoAppOptions {
  tokenVerifier?: IdentityTokenVerifier
}

export const createTodoApp = ({ tokenVerifier = createDevelopmentIdentityTokenCodec() }: TodoAppOptions = {}) => {
  const app = new Hono()
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })
  const handler = new RPCHandler(createTodoRouter(todos, tokenVerifier))

  app.get('/health', context => context.json({ service: 'todo', message: 'todo service is running' }))
  app.use(`${todoRpcMountPath}/*`, async (context, next) => {
    const request = requestWithoutTodoRpcMountPath(context.req.raw)
    const { matched, response } = await handler.handle(request)

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
