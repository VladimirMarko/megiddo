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
import type { FrontendApi, FrontendAuthSession, FrontendTodo } from './api/frontend-api-adapter'

export type { FrontendApi } from './api/frontend-api-adapter'

interface TodoRouteContext {
  api: FrontendApi
}

const todosAtom = atom<FrontendTodo[]>([])
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

function AuthSessionPrompt({
  buttonText,
  message,
  messageRole,
  onSignIn,
}: {
  buttonText: string
  message: string
  messageRole?: 'alert'
  onSignIn: () => void
}) {
  return (
    <main>
      <h1>Todos</h1>
      <p role={messageRole}>{message}</p>
      <button onClick={onSignIn} type="button">
        {buttonText}
      </button>
    </main>
  )
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

    const loadSession = async () => {
      try {
        const nextSession = await api.getAuthSession()

        if (cancelled) {
          return
        }

        setAuthSession(nextSession)

        if (nextSession.state !== 'logged-in') {
          setTodos([])
          return
        }

        const nextTodos = await api.listTodos()

        if (cancelled) {
          return
        }

        setTodos(nextTodos)
        setError(undefined)
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Could not load todos')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSession()

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
    return <AuthSessionPrompt buttonText="Sign in" message="Sign in to manage todos." onSignIn={() => void signIn()} />
  }

  if (authSession.state === 'expired') {
    return (
      <AuthSessionPrompt
        buttonText="Sign in again"
        message="Session expired. Sign in again to manage todos."
        messageRole="alert"
        onSignIn={() => void signIn()}
      />
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

function TodoItem({ api, todo }: { api: FrontendApi; todo: FrontendTodo }) {
  const setTodos = useSetAtom(todosAtom)
  const completed = todo.status === 'completed'
  const status = completed ? 'Completed' : 'Open'
  const toggleAction = completed ? 'Reopen' : 'Complete'
  const updateTodo = (updated: FrontendTodo) =>
    setTodos(current => current.map(candidate => (candidate.id === updated.id ? updated : candidate)))

  const toggleTodo = async () => {
    if (completed) {
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
          <input aria-label={`Rename ${todo.title}`} defaultValue={todo.title} disabled={completed} name="title" />
        </label>
        <button aria-label={`Save rename for ${todo.title}`} disabled={completed} type="submit">
          Save rename
        </button>
      </form>
    </li>
  )
}
