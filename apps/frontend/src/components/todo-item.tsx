// biome-ignore lint/correctness/noUnusedImports: node test JSX transform expects React in scope.
import * as React from 'react'
import type { FrontendTodo } from '../api/frontend-api-adapter'
import { readTitle } from './form-title'

export function TodoItem({
  onComplete,
  onRename,
  onReopen,
  todo,
}: {
  onComplete: (id: string) => Promise<void>
  onRename: (input: { id: string; title: string }) => Promise<void>
  onReopen: (id: string) => Promise<void>
  todo: FrontendTodo
}) {
  const isCompleted = todo.status === 'completed'
  const statusLabel = isCompleted ? 'Completed' : 'Open'
  const toggleActionLabel = isCompleted ? 'Reopen' : 'Complete'

  const toggleTodo = async () => {
    if (isCompleted) {
      await onReopen(todo.id)
      return
    }

    await onComplete(todo.id)
  }

  const renameTodo = async (formElement: HTMLFormElement) => {
    const title = readTitle(formElement)

    if (!title || title === todo.title) {
      return
    }

    await onRename({ id: todo.id, title })
  }

  return (
    <li>
      <span>{todo.title}</span>
      <span>{statusLabel}</span>
      <button aria-label={`${toggleActionLabel} ${todo.title}`} onClick={toggleTodo} type="button">
        {toggleActionLabel}
      </button>
      <form
        aria-label={`Rename ${todo.title}`}
        onSubmit={event => {
          event.preventDefault()
          void renameTodo(event.currentTarget)
        }}
      >
        <label>
          Rename
          <input aria-label={`Rename ${todo.title}`} defaultValue={todo.title} disabled={isCompleted} name="title" />
        </label>
        <button aria-label={`Save rename for ${todo.title}`} disabled={isCompleted} type="submit">
          Save rename
        </button>
      </form>
    </li>
  )
}
