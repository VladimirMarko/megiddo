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
import type { FrontendApi, FrontendAuthSession } from './api/frontend-api-adapter'

export type { FrontendApi } from './api/frontend-api-adapter'

interface TodoRouteContext {
  api: FrontendApi
}

const todosAtom = atom<TodoResourceV1[]>([])
const loadingAtom = atom(true)
const errorAtom = atom<string | undefined>(undefined)
const authSessionAtom = atom<FrontendAuthSession | undefined>(undefined)

const readFormData = (formElement: HTMLFormElement) => {
  const view = formElement.ownerDocument.defaultView

  if (!view) {
    throw new Error('Missing browser window')
  }

  return new view.FormData(formElement)
}

const readTitle = (formElement: HTMLFormElement) => String(readFormData(formElement).get('title') ?? '').trim()

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
  const [authSession, setAuthSession] = useAtom(authSessionAtom)
  const form = useForm({
    defaultValues: { title: '' },
    onSubmit: async () => {},
  })
  const createTodo = async (formElement: HTMLFormElement) => {
    const title = readTitle(formElement)

    if (!title) {
      return
    }

    const todo = await api.createTodo({ title })
    setTodos(current => [...current, todo])
    form.reset()
    formElement.reset()
  }

  const loadTodos = async () => {
    setLoading(true)
    setError(undefined)

    try {
      setTodos(await api.listTodos())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load todos')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async () => {
    const nextSession = await api.signInDevelopment()
    setAuthSession(nextSession)

    if (nextSession.state === 'logged-in') {
      await loadTodos()
    }
  }

  const signOut = async () => {
    setAuthSession(await api.signOut())
    setTodos([])
    setLoading(false)
    setError(undefined)
  }

  useEffect(() => {
    let cancelled = false

    api
      .getAuthSession()
      .then(async nextSession => {
        if (cancelled) {
          return
        }

        setAuthSession(nextSession)

        if (nextSession.state !== 'logged-in') {
          setTodos([])
          setLoading(false)
          return
        }

        setTodos(await api.listTodos())
        setError(undefined)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load todos')
          setLoading(false)
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
  }, [api, setAuthSession, setError, setLoading, setTodos])

  if (!authSession) {
    return (
      <main>
        <h1>Todos</h1>
        <p>Checking session...</p>
      </main>
    )
  }

  if (authSession.state === 'logged-out') {
    return (
      <main>
        <h1>Todos</h1>
        <p>Sign in to manage todos.</p>
        <button onClick={() => void signIn()} type="button">
          Sign in
        </button>
      </main>
    )
  }

  if (authSession.state === 'expired') {
    return (
      <main>
        <h1>Todos</h1>
        <p role="alert">Session expired. Sign in again to manage todos.</p>
        <button onClick={() => void signIn()} type="button">
          Sign in again
        </button>
      </main>
    )
  }

  return (
    <main>
      <h1>Todos</h1>
      <p>Signed in as {authSession.user.id}</p>
      <button onClick={() => void signOut()} type="button">
        Sign out
      </button>
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
  const status = todo.completed ? 'Completed' : 'Open'
  const toggleAction = todo.completed ? 'Reopen' : 'Complete'
  const updateTodo = (updated: TodoResourceV1) =>
    setTodos(current => current.map(candidate => (candidate.id === updated.id ? updated : candidate)))

  const toggleTodo = async () => {
    if (todo.completed) {
      updateTodo(await api.reopenTodo({ id: todo.id }))
      return
    }

    updateTodo(await api.completeTodo({ id: todo.id }))
  }

  const renameTodo = async (formElement: HTMLFormElement) => {
    const title = readTitle(formElement)

    if (!title || title === todo.title) {
      return
    }

    updateTodo(await api.renameTodo({ id: todo.id, title }))
  }

  return (
    <li>
      <span>{todo.title}</span>
      <span>{status}</span>
      <button aria-label={`${toggleAction} ${todo.title}`} onClick={toggleTodo} type="button">
        {toggleAction}
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
