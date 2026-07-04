import type { TodoResourceV1 } from '@megiddo/contracts'
import { useForm } from '@tanstack/react-form'
import {
  createBrowserHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { atom, Provider, useAtom, useSetAtom } from 'jotai'
import * as React from 'react'
import { type ReactElement, useEffect } from 'react'
import type { FrontendApi } from './api/frontend-api-adapter'

export type { FrontendApi } from './api/frontend-api-adapter'

interface TodoRouteContext {
  api: FrontendApi
}

const todosAtom = atom<TodoResourceV1[]>([])
const loadingAtom = atom(true)
const errorAtom = atom<string | undefined>(undefined)

const readFormData = (formElement: HTMLFormElement) => {
  const view = formElement.ownerDocument.defaultView

  if (!view) {
    throw new Error('Missing browser window')
  }

  return new view.FormData(formElement)
}

const rootRoute = createRootRouteWithContext<TodoRouteContext>()({
  component: () => React.createElement(Outlet),
})

const todoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: TodoScreen,
})

const routeTree = rootRoute.addChildren([todoRoute])

export const createTodoRouter = (api: FrontendApi) =>
  createRouter({
    context: { api },
    history: createBrowserHistory(),
    routeTree,
  })

export const createTodoApp = ({ api }: { api: FrontendApi }): ReactElement => {
  const router = createTodoRouter(api)
  void router.load()

  return (
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  )
}

function TodoScreen() {
  const { api } = todoRoute.useRouteContext()
  const [todos, setTodos] = useAtom(todosAtom)
  const [loading, setLoading] = useAtom(loadingAtom)
  const [error, setError] = useAtom(errorAtom)
  const form = useForm({
    defaultValues: { title: '' },
    onSubmit: async () => {},
  })
  const createTodo = async (formElement: HTMLFormElement) => {
    const formData = readFormData(formElement)
    const title = String(formData.get('title') ?? '').trim()

    if (!title) {
      return
    }

    const todo = await api.createTodo({ title })
    setTodos(current => [...current, todo])
    form.reset()
    formElement.reset()
  }

  useEffect(() => {
    let cancelled = false

    api
      .listTodos()
      .then(nextTodos => {
        if (!cancelled) {
          setTodos(nextTodos)
          setError(undefined)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load todos')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [api, setError, setLoading, setTodos])

  return (
    <main>
      <h1>Todos</h1>
      <form
        aria-label="Create todo"
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

      {loading ? <p>Loading todos...</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <ul>
        {todos.map(todo => (
          <TodoItem api={api} key={todo.id} todo={todo} />
        ))}
      </ul>
    </main>
  )
}

function TodoItem({ api, todo }: { api: FrontendApi; todo: TodoResourceV1 }) {
  const setTodos = useSetAtom(todosAtom)
  const updateTodo = (updated: TodoResourceV1) =>
    setTodos(current => current.map(candidate => (candidate.id === updated.id ? updated : candidate)))

  const toggleTodo = async () => {
    updateTodo(todo.completed ? await api.reopenTodo({ id: todo.id }) : await api.completeTodo({ id: todo.id }))
  }

  const renameTodo = async (formElement: HTMLFormElement) => {
    const formData = readFormData(formElement)
    const title = String(formData.get('title') ?? '').trim()

    if (!title || title === todo.title) {
      return
    }

    updateTodo(await api.renameTodo({ id: todo.id, title }))
  }

  return (
    <li>
      <span>{todo.title}</span>
      <span>{todo.completed ? 'Completed' : 'Open'}</span>
      <button aria-label={`${todo.completed ? 'Reopen' : 'Complete'} ${todo.title}`} onClick={toggleTodo} type="button">
        {todo.completed ? 'Reopen' : 'Complete'}
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
          <input aria-label={`Rename ${todo.title}`} defaultValue={todo.title} disabled={todo.completed} name="title" />
        </label>
        <button aria-label={`Save rename for ${todo.title}`} disabled={todo.completed} type="submit">
          Save rename
        </button>
      </form>
    </li>
  )
}
