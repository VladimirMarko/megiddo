import { useForm } from '@tanstack/react-form'
// biome-ignore lint/correctness/noUnusedImports: node test JSX transform expects React in scope.
import * as React from 'react'
import { readTitle } from './form-title'

type TodoCreateFormProps = {
  onCreate: (title: string) => Promise<void>
}

export function TodoCreateForm({ onCreate }: TodoCreateFormProps) {
  const form = useForm({
    defaultValues: { title: '' },
    onSubmit: async () => {},
  })

  const createTodo = async (formElement: HTMLFormElement) => {
    const title = readTitle(formElement)

    if (!title) {
      return
    }

    try {
      await onCreate(title)
    } catch {
      return
    }

    form.reset()
    formElement.reset()
  }

  return (
    <form
      aria-label="Create todo"
      className="todo-create-form"
      onSubmit={event => {
        event.preventDefault()
        event.stopPropagation()
        void createTodo(event.currentTarget)
      }}
    >
      <form.Field name="title">
        {field => (
          <label>
            New todo
            <input
              name={field.name}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
              value={field.state.value}
            />
          </label>
        )}
      </form.Field>
      <button type="submit">Add todo</button>
    </form>
  )
}
