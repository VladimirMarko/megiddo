import { apiGatewayContractV1, gatewayStatus } from '@megiddo/contracts'
import { implement } from '@orpc/server'
import type { TodoServiceClient } from './todo-service-client'

const apiGatewayV1 = implement(apiGatewayContractV1)

export const createApiGatewayRouter = ({ todoClient }: { todoClient: TodoServiceClient }) =>
  apiGatewayV1.router({
    v1: {
      gateway: {
        status: apiGatewayV1.v1.gateway.status.handler(() => gatewayStatus),
      },
      viewer: {
        todos: {
          list: apiGatewayV1.v1.viewer.todos.list.handler(() => todoClient.listTodos()),
          create: apiGatewayV1.v1.viewer.todos.create.handler(({ input }) => todoClient.createTodo(input)),
          complete: apiGatewayV1.v1.viewer.todos.complete.handler(({ input }) => todoClient.completeTodo(input)),
          reopen: apiGatewayV1.v1.viewer.todos.reopen.handler(({ input }) => todoClient.reopenTodo(input)),
          rename: apiGatewayV1.v1.viewer.todos.rename.handler(({ input }) => todoClient.renameTodo(input)),
        },
      },
    },
  })

export type ApiGatewayRouter = ReturnType<typeof createApiGatewayRouter>
