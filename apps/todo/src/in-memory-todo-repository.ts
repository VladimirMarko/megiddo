import type { TodoRecord, TodoRepository } from './todo-use-cases'

export const createInMemoryTodoRepository = (): TodoRepository => {
  const todos = new Map<string, TodoRecord>()
  let nextTodoNumber = 1

  return {
    async listByOwner(ownerId) {
      return Array.from(todos.values()).filter(todo => todo.ownerId === ownerId)
    },
    async create(input) {
      const todo = {
        id: `todo-${nextTodoNumber}`,
        ownerId: input.ownerId,
        title: input.title,
        completed: false,
      }
      nextTodoNumber += 1
      todos.set(todo.id, todo)

      return todo
    },
    async findByOwner(input) {
      const todo = todos.get(input.id)

      if (todo?.ownerId !== input.ownerId) {
        return undefined
      }

      return todo
    },
    async save(todo) {
      todos.set(todo.id, todo)

      return todo
    },
  }
}
