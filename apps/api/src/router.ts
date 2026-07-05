import { apiGatewayContractV1, gatewayStatus, todoServiceAudienceV1 } from '@megiddo/contracts'
import { implement } from '@orpc/server'
import type { IdentityServiceClient } from './identity-service-client'
import type { TodoServiceClient } from './todo-service-client'

const apiGatewayV1 = implement(apiGatewayContractV1)

const issueTodoIdentityToken = async (identityClient: IdentityServiceClient) =>
  (
    await identityClient.issueDevelopmentIdentityToken({
      audience: todoServiceAudienceV1,
      contractVersion: 'v1',
    })
  ).identityToken

const withTodoIdentityToken = async <Input extends object>(identityClient: IdentityServiceClient, input: Input) => ({
  ...input,
  identityToken: await issueTodoIdentityToken(identityClient),
})

export const createApiGatewayRouter = ({
  identityClient,
  todoClient,
}: {
  identityClient: IdentityServiceClient
  todoClient: TodoServiceClient
}) =>
  apiGatewayV1.router({
    v1: {
      gateway: {
        status: apiGatewayV1.v1.gateway.status.handler(() => gatewayStatus),
      },
      viewer: {
        todos: {
          list: apiGatewayV1.v1.viewer.todos.list.handler(async () =>
            todoClient.listTodos(await withTodoIdentityToken(identityClient, {})),
          ),
          create: apiGatewayV1.v1.viewer.todos.create.handler(async ({ input }) =>
            todoClient.createTodo(await withTodoIdentityToken(identityClient, input)),
          ),
          complete: apiGatewayV1.v1.viewer.todos.complete.handler(async ({ input }) =>
            todoClient.completeTodo(await withTodoIdentityToken(identityClient, input)),
          ),
          reopen: apiGatewayV1.v1.viewer.todos.reopen.handler(async ({ input }) =>
            todoClient.reopenTodo(await withTodoIdentityToken(identityClient, input)),
          ),
          rename: apiGatewayV1.v1.viewer.todos.rename.handler(async ({ input }) =>
            todoClient.renameTodo(await withTodoIdentityToken(identityClient, input)),
          ),
        },
      },
    },
  })

export type ApiGatewayRouter = ReturnType<typeof createApiGatewayRouter>
