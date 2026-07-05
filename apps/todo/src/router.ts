import { todoContractV1, todoOperationalHealthV1, todoServiceAudienceV1 } from '@megiddo/contracts'
import type { IdentityTokenVerifier } from '@megiddo/platform'
import { implement, ORPCError } from '@orpc/server'
import type { TodoUseCases } from './todo-use-cases'

const todoV1 = implement(todoContractV1)

const verifyTodoCaller = async (tokenVerifier: IdentityTokenVerifier, identityToken: string) => {
  try {
    return await tokenVerifier.verifyIdentityToken({ audience: todoServiceAudienceV1, identityToken })
  } catch (cause) {
    throw new ORPCError('UNAUTHORIZED', { cause, message: 'Invalid Identity Token' })
  }
}

const verifyTodoOwnerId = async (tokenVerifier: IdentityTokenVerifier, identityToken: string) =>
  (await verifyTodoCaller(tokenVerifier, identityToken)).subject

export const createTodoRouter = (todos: TodoUseCases, tokenVerifier: IdentityTokenVerifier) =>
  todoV1.router({
    v1: {
      operational: {
        health: todoV1.v1.operational.health.handler(() => todoOperationalHealthV1),
      },
      todos: {
        list: todoV1.v1.todos.list.handler(async ({ input }) => {
          const ownerId = await verifyTodoOwnerId(tokenVerifier, input.identityToken)
          return todos.list(ownerId)
        }),
        create: todoV1.v1.todos.create.handler(async ({ input }) => {
          const ownerId = await verifyTodoOwnerId(tokenVerifier, input.identityToken)
          return todos.create({ ownerId, title: input.title })
        }),
        complete: todoV1.v1.todos.complete.handler(async ({ input }) => {
          const ownerId = await verifyTodoOwnerId(tokenVerifier, input.identityToken)
          return todos.complete({ id: input.id, ownerId })
        }),
        reopen: todoV1.v1.todos.reopen.handler(async ({ input }) => {
          const ownerId = await verifyTodoOwnerId(tokenVerifier, input.identityToken)
          return todos.reopen({ id: input.id, ownerId })
        }),
        rename: todoV1.v1.todos.rename.handler(async ({ input }) => {
          const ownerId = await verifyTodoOwnerId(tokenVerifier, input.identityToken)
          return todos.rename({ id: input.id, ownerId, title: input.title })
        }),
      },
    },
  })

export type TodoRouter = ReturnType<typeof createTodoRouter>
