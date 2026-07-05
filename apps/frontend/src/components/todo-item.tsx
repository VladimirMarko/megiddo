// biome-ignore lint/correctness/noUnusedImports: node test JSX transform expects React in scope.
import * as React from 'react'
import { useRef, useState } from 'react'
import type { FrontendTodo } from '../api/frontend-api-adapter'

type RenameTodoInput = {
  id: string
  title: string
}

type TodoItemProps = {
  onComplete: (id: string) => Promise<void>
  onRename: (input: RenameTodoInput) => Promise<void>
  onReopen: (id: string) => Promise<void>
  todo: FrontendTodo
}

export function TodoItem({ onComplete, onRename, onReopen, todo }: TodoItemProps) {
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const isCompleted = todo.status === 'completed'
  const statusLabel = isCompleted ? 'Completed' : 'Open'
  const toggleActionLabel = isCompleted ? 'Reopen' : 'Complete'

  const toggleTodo = async () => {
    const toggle = isCompleted ? onReopen : onComplete

    try {
      await toggle(todo.id)
    } catch {
      return
    }
  }

  const startRenaming = () => {
    setIsEditing(true)
  }

  const cancelRenaming = () => {
    setIsEditing(false)
  }

  const confirmRenaming = async () => {
    const title = renameInputRef.current?.value.trim() ?? ''

    if (!title || title === todo.title) {
      cancelRenaming()
      return
    }

    try {
      await onRename({ id: todo.id, title })
      setIsEditing(false)
    } catch {
      return
    }
  }

  return (
    <li className="todo-item">
      <input
        aria-label={`${toggleActionLabel} ${todo.title}`}
        checked={isCompleted}
        onChange={toggleTodo}
        type="checkbox"
      />
      <div className="todo-content">
        {isEditing ? (
          <input
            aria-label={`Rename ${todo.title}`}
            className="todo-rename-input"
            defaultValue={todo.title}
            name="title"
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void confirmRenaming()
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                cancelRenaming()
              }
            }}
            ref={renameInputRef}
          />
        ) : (
          <span className={isCompleted ? 'todo-title todo-title-completed' : 'todo-title'}>{todo.title}</span>
        )}
        {isEditing ? (
          <div className="todo-actions">
            <button
              aria-label={`Confirm rename for ${todo.title}`}
              onClick={() => void confirmRenaming()}
              type="button"
            >
              ✓
            </button>
            <button aria-label={`Cancel rename for ${todo.title}`} onClick={cancelRenaming} type="button">
              ×
            </button>
          </div>
        ) : isCompleted ? null : (
          <button aria-label={`Edit ${todo.title}`} className="icon-button" onClick={startRenaming} type="button">
            ✎
          </button>
        )}
        <span className="todo-status">{statusLabel}</span>
      </div>
    </li>
  )
}
