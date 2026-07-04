import type {
  ApiGatewayContractV1,
  GatewayStatus,
  TodoByIdInputV1,
  TodoCreateInputV1,
  TodoRenameInputV1,
  TodoResourceV1,
} from '@megiddo/contracts'
import { apiGatewayRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface FrontendApi {
  getGatewayStatus(): Promise<GatewayStatus>
  listTodos(): Promise<TodoResourceV1[]>
  createTodo(input: TodoCreateInputV1): Promise<TodoResourceV1>
  completeTodo(input: TodoByIdInputV1): Promise<TodoResourceV1>
  reopenTodo(input: TodoByIdInputV1): Promise<TodoResourceV1>
  renameTodo(input: TodoRenameInputV1): Promise<TodoResourceV1>
}

interface FrontendApiOptions {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
}

export const createFrontendApi = ({
  baseUrl = 'http://localhost:3000',
  fetch,
}: FrontendApiOptions = {}): FrontendApi => {
  const link = new RPCLink({ fetch, url: apiGatewayRpcUrl(baseUrl) })
  const client = createORPCClient<ApiGatewayContractV1>(link)

  return {
    getGatewayStatus() {
      return client.v1.gateway.status()
    },
    listTodos() {
      return client.v1.viewer.todos.list()
    },
    createTodo(input) {
      return client.v1.viewer.todos.create(input)
    },
    completeTodo(input) {
      return client.v1.viewer.todos.complete(input)
    },
    reopenTodo(input) {
      return client.v1.viewer.todos.reopen(input)
    },
    renameTodo(input) {
      return client.v1.viewer.todos.rename(input)
    },
  }
}
