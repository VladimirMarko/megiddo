const developmentTodoOwnerId = 'development-owner'

export interface TodoRecord {
  id: string
  ownerId: string
  title: string
  completed: boolean
}

export interface TodoRepository {
  listByOwner(ownerId: string): Promise<TodoRecord[]>
  create(input: { ownerId: string; title: string }): Promise<TodoRecord>
  findByOwner(input: { ownerId: string; id: string }): Promise<TodoRecord | undefined>
  save(todo: TodoRecord): Promise<TodoRecord>
}

export interface TodoView {
  id: string
  title: string
  completed: boolean
}

export class TodoNotFoundError extends Error {
  constructor(id: string) {
    super(`Todo not found: ${id}`)
  }
}

export class CompletedTodoRenameError extends Error {
  constructor() {
    super('Completed todos cannot be renamed unless reopened first')
  }
}

export interface TodoUseCases {
  list(): Promise<TodoView[]>
  create(input: { title: string }): Promise<TodoView>
  complete(input: { id: string }): Promise<TodoView>
  reopen(input: { id: string }): Promise<TodoView>
  rename(input: { id: string; title: string }): Promise<TodoView>
}

const toView = (todo: TodoRecord): TodoView => ({
  id: todo.id,
  title: todo.title,
  completed: todo.completed,
})

export const createTodoUseCases = ({ repository }: { repository: TodoRepository }): TodoUseCases => {
  const getOwnedTodo = async (id: string) => {
    const todo = await repository.findByOwner({ ownerId: developmentTodoOwnerId, id })

    if (!todo) {
      throw new TodoNotFoundError(id)
    }

    return todo
  }

  return {
    async list() {
      return (await repository.listByOwner(developmentTodoOwnerId)).map(toView)
    },
    async create(input) {
      return toView(await repository.create({ ownerId: developmentTodoOwnerId, title: input.title }))
    },
    async complete(input) {
      const todo = await getOwnedTodo(input.id)
      return toView(await repository.save({ ...todo, completed: true }))
    },
    async reopen(input) {
      const todo = await getOwnedTodo(input.id)
      return toView(await repository.save({ ...todo, completed: false }))
    },
    async rename(input) {
      const todo = await getOwnedTodo(input.id)

      if (todo.completed) {
        throw new CompletedTodoRenameError()
      }

      return toView(await repository.save({ ...todo, title: input.title }))
    },
  }
}
