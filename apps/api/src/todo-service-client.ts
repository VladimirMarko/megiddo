import type {
  AuthenticatedTodoInputV1,
  TodoByIdInputV1,
  TodoContractClientV1,
  TodoCreateInputV1,
  TodoRenameInputV1,
  TodoResourceV1,
} from '@megiddo/contracts'
import { todoRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface TodoServiceClient {
  listTodos(input: AuthenticatedTodoInputV1): Promise<TodoResourceV1[]>
  createTodo(input: TodoCreateInputV1): Promise<TodoResourceV1>
  completeTodo(input: TodoByIdInputV1): Promise<TodoResourceV1>
  reopenTodo(input: TodoByIdInputV1): Promise<TodoResourceV1>
  renameTodo(input: TodoRenameInputV1): Promise<TodoResourceV1>
}

interface TodoServiceClientOptions {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
}

export const createTodoServiceClient = ({
  baseUrl = 'http://localhost:3001',
  fetch,
}: TodoServiceClientOptions = {}): TodoServiceClient => {
  const link = new RPCLink({ fetch, url: todoRpcUrl(baseUrl) })
  const client = createORPCClient<TodoContractClientV1>(link)

  return {
    listTodos(input) {
      return client.v1.todos.list(input)
    },
    createTodo(input) {
      return client.v1.todos.create(input)
    },
    completeTodo(input) {
      return client.v1.todos.complete(input)
    },
    reopenTodo(input) {
      return client.v1.todos.reopen(input)
    },
    renameTodo(input) {
      return client.v1.todos.rename(input)
    },
  }
}
