import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import type { CreateOwnedTodoInput, OwnedTodoInput, TodoRecord, TodoRepository } from './todo-use-cases'

export interface EmbeddedTodoRepositoryOptions {
  databasePath: string
}

export interface EmbeddedTodoRepository extends TodoRepository {
  close(): void
}

interface TodoRow {
  id: string
  owner_id: string
  title: string
  completed: 0 | 1
}

interface TodoSequenceRow {
  next_todo_number: number
}

const toRecord = (row: TodoRow): TodoRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  title: row.title,
  completed: row.completed === 1,
})

export const createEmbeddedTodoRepository = ({
  databasePath,
}: EmbeddedTodoRepositoryOptions): EmbeddedTodoRepository => {
  mkdirSync(dirname(databasePath), { recursive: true })

  const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
  const database = new DatabaseSync(databasePath)

  database.exec(`
    CREATE TABLE IF NOT EXISTS todo_sequence (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      next_todo_number INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL CHECK (completed IN (0, 1))
    );

    INSERT OR IGNORE INTO todo_sequence (id, next_todo_number) VALUES (1, 1);
  `)

  const listByOwner = database.prepare(`
    SELECT id, owner_id, title, completed
    FROM todos
    WHERE owner_id = ?
    ORDER BY id
  `)
  const findByOwner = database.prepare(`
    SELECT id, owner_id, title, completed
    FROM todos
    WHERE id = ? AND owner_id = ?
  `)
  const readNextTodoNumber = database.prepare(`
    SELECT next_todo_number
    FROM todo_sequence
    WHERE id = 1
  `)
  const advanceNextTodoNumber = database.prepare(`
    UPDATE todo_sequence
    SET next_todo_number = ?
    WHERE id = 1
  `)
  const insertTodo = database.prepare(`
    INSERT INTO todos (id, owner_id, title, completed)
    VALUES (?, ?, ?, 0)
  `)
  const saveTodo = database.prepare(`
    UPDATE todos
    SET owner_id = ?, title = ?, completed = ?
    WHERE id = ?
  `)

  return {
    async listByOwner(ownerId) {
      return (listByOwner.all(ownerId) as TodoRow[]).map(toRecord)
    },
    async create(input: CreateOwnedTodoInput) {
      const sequence = readNextTodoNumber.get() as TodoSequenceRow
      const nextTodoNumber = sequence.next_todo_number
      const todo = {
        id: `todo-${nextTodoNumber}`,
        ownerId: input.ownerId,
        title: input.title,
        completed: false,
      }

      insertTodo.run(todo.id, todo.ownerId, todo.title)
      advanceNextTodoNumber.run(nextTodoNumber + 1)

      return todo
    },
    async findByOwner(input: OwnedTodoInput) {
      const row = findByOwner.get(input.id, input.ownerId)

      return row ? toRecord(row as TodoRow) : undefined
    },
    async save(todo) {
      saveTodo.run(todo.ownerId, todo.title, todo.completed ? 1 : 0, todo.id)

      return todo
    },
    close() {
      database.close()
    },
  }
}
