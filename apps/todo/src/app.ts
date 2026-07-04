import { todoRpcMountPath } from '@megiddo/platform'
import { RPCHandler } from '@orpc/server/fetch'
import { Hono } from 'hono'
import { createInMemoryTodoRepository } from './in-memory-todo-repository'
import { createTodoRouter } from './router'
import { createTodoUseCases } from './todo-use-cases'

export const createTodoApp = () => {
  const app = new Hono()
  const todos = createTodoUseCases({ repository: createInMemoryTodoRepository() })
  const handler = new RPCHandler(createTodoRouter(todos))

  app.get('/health', context => context.json({ service: 'todo', message: 'todo service is running' }))
  app.use(`${todoRpcMountPath}/*`, async (context, next) => {
    const url = new URL(context.req.raw.url)
    url.pathname = url.pathname.slice(todoRpcMountPath.length) || '/'

    const request = new Request(url, context.req.raw)
    const { matched, response } = await handler.handle(request)

    if (matched) {
      return response
    }

    return next()
  })

  return app
}
