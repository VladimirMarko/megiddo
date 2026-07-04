import { todoContractV1 } from '@megiddo/contracts'
import { implement } from '@orpc/server'
import type { TodoUseCases } from './todo-use-cases'

const todoV1 = implement(todoContractV1)

export const createTodoRouter = (todos: TodoUseCases) =>
  todoV1.router({
    v1: {
      todos: {
        list: todoV1.v1.todos.list.handler(() => todos.list()),
        create: todoV1.v1.todos.create.handler(({ input }) => todos.create(input)),
        complete: todoV1.v1.todos.complete.handler(({ input }) => todos.complete(input)),
        reopen: todoV1.v1.todos.reopen.handler(({ input }) => todos.reopen(input)),
        rename: todoV1.v1.todos.rename.handler(({ input }) => todos.rename(input)),
      },
    },
  })

export type TodoRouter = ReturnType<typeof createTodoRouter>
