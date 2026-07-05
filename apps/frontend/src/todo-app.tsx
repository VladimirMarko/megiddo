import {
  createBrowserHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { atom, Provider, useAtom } from 'jotai'
import * as React from 'react'
import { type ReactElement, useEffect } from 'react'
import type { FrontendApi, FrontendAuthSession, FrontendTodo } from './api/frontend-api-adapter'
import { AuthSessionPrompt } from './components/auth-session-prompt'
import { TodoCreateForm } from './components/todo-create-form'
import { TodoItem } from './components/todo-item'

export type { FrontendApi } from './api/frontend-api-adapter'

interface TodoRouteContext {
  api: FrontendApi
}

const todosAtom = atom<FrontendTodo[]>([])
const loadingAtom = atom(true)
const errorAtom = atom<string | undefined>(undefined)
const authSessionAtom = atom<FrontendAuthSession | undefined>(undefined)

const mutationErrorMessage = (caught: unknown, fallback: string) =>
  caught instanceof Error ? caught.message : fallback

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
  const runTodoMutation = async (mutation: () => Promise<void>, fallbackError: string) => {
    setError(undefined)

    try {
      await mutation()
    } catch (caught) {
      setError(mutationErrorMessage(caught, fallbackError))
      throw caught
    }
  }
  const createTodo = async (title: string) => {
    await runTodoMutation(async () => {
      const todo = await api.createTodo({ title })
      setTodos(current => [...current, todo])
    }, 'Could not create todo')
  }
  const updateTodo = (updated: FrontendTodo) =>
    setTodos(current => current.map(candidate => (candidate.id === updated.id ? updated : candidate)))
  const completeTodo = async (id: string) =>
    runTodoMutation(async () => updateTodo(await api.completeTodo({ id })), 'Could not complete todo')
  const reopenTodo = async (id: string) =>
    runTodoMutation(async () => updateTodo(await api.reopenTodo({ id })), 'Could not reopen todo')
  const renameTodo = async ({ id, title }: { id: string; title: string }) =>
    runTodoMutation(async () => updateTodo(await api.renameTodo({ id, title })), 'Could not rename todo')

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
      <TodoCreateForm onCreate={createTodo} />

      {loading ? <p>Loading todos...</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <ul>
        {todos.map(todo => (
          <TodoItem key={todo.id} onComplete={completeTodo} onRename={renameTodo} onReopen={reopenTodo} todo={todo} />
        ))}
      </ul>
    </main>
  )
}
