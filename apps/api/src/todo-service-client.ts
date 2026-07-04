import type { TodoContractClientV1, TodoResourceV1 } from '@megiddo/contracts'
import { todoRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface TodoServiceClient {
  listTodos(): Promise<TodoResourceV1[]>
  createTodo(input: { title: string }): Promise<TodoResourceV1>
  completeTodo(input: { id: string }): Promise<TodoResourceV1>
  reopenTodo(input: { id: string }): Promise<TodoResourceV1>
  renameTodo(input: { id: string; title: string }): Promise<TodoResourceV1>
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
    listTodos() {
      return client.v1.todos.list()
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
