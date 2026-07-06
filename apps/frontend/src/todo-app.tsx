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
import type {
  FrontendApi,
  FrontendAuthCapabilities,
  FrontendAuthSession,
  FrontendTodo,
} from './api/frontend-api-adapter'
import { AuthSessionPrompt } from './components/auth-session-prompt'
import { Title } from './components/title'
import { TodoCreateForm } from './components/todo-create-form'
import { TodoItem } from './components/todo-item'

export type { FrontendApi } from './api/frontend-api-adapter'

interface TodoRouteContext {
  api: FrontendApi
  dummyAuthLoginShortcutEnabled: boolean
}

const todosAtom = atom<FrontendTodo[]>([])
const filterAtom = atom<'all' | 'completed' | 'open'>('all')
const filteredTodosAtom = atom(get => {
  const filter = get(filterAtom)
  const todos = get(todosAtom)

  if (filter === 'completed') {
    return todos.filter(todo => todo.status === 'completed')
  }

  if (filter === 'open') {
    return todos.filter(todo => todo.status === 'open')
  }

  return todos
})
const loadingAtom = atom(true)
const errorAtom = atom<string | undefined>(undefined)
const authSessionAtom = atom<FrontendAuthSession | undefined>(undefined)
const authCapabilitiesAtom = atom<FrontendAuthCapabilities | undefined>(undefined)

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

export const createTodoRouter = (api: FrontendApi, dummyAuthLoginShortcutEnabled = false) =>
  createRouter({
    context: { api, dummyAuthLoginShortcutEnabled },
    history: createBrowserHistory(),
    routeTree,
  })

export const createTodoApp = ({
  api,
  dummyAuthLoginShortcutEnabled = false,
}: {
  api: FrontendApi
  dummyAuthLoginShortcutEnabled?: boolean
}): ReactElement => {
  const router = createTodoRouter(api, dummyAuthLoginShortcutEnabled)
  void router.load()

  return (
    <Provider>
      <RouterProvider router={router} />
    </Provider>
  )
}

function TodoScreen() {
  const { api, dummyAuthLoginShortcutEnabled } = todoRoute.useRouteContext()
  const setTodos = useSetAtom(todosAtom)
  const [filteredTodos] = useAtom(filteredTodosAtom)
  const [filter, setFilter] = useAtom(filterAtom)
  const [loading, setLoading] = useAtom(loadingAtom)
  const [error, setError] = useAtom(errorAtom)
  const [authSession, setAuthSession] = useAtom(authSessionAtom)
  const [authCapabilities, setAuthCapabilities] = useAtom(authCapabilitiesAtom)
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
      setError(mutationErrorMessage(caught, 'Could not load todos'))
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (principalId: string) => {
    const nextSession = await api.signIn({ method: 'dummy', principalId })
    setAuthSession(nextSession)

    if (nextSession.state === 'logged-in') {
      await loadTodos()
    }
  }

  const signUp = async (displayName: string) => {
    const nextSession = await api.signUp({ displayName, method: 'dummy' })
    setAuthSession(nextSession)
    setAuthCapabilities(await api.getAuthCapabilities())

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
        const nextCapabilities = await api.getAuthCapabilities()

        if (cancelled) {
          return
        }

        setAuthSession(nextSession)
        setAuthCapabilities(nextCapabilities)

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
          setError(mutationErrorMessage(caught, 'Could not load todos'))
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
  }, [api, setAuthCapabilities, setAuthSession, setError, setLoading, setTodos])

  if (!authSession) {
    return (
      <main className="todo-shell">
        <Title />
        <p className="todo-message">Checking session...</p>
      </main>
    )
  }

  if (authSession.state === 'logged-out') {
    return (
      <AuthSessionPrompt
        capabilities={authCapabilities}
        dummyAuthLoginShortcutEnabled={dummyAuthLoginShortcutEnabled}
        message="Sign in to manage todos."
        onDummySignIn={principalId => void signIn(principalId)}
        onDummySignUp={displayName => void signUp(displayName)}
      />
    )
  }

  if (authSession.state === 'expired') {
    return (
      <AuthSessionPrompt
        capabilities={authCapabilities}
        dummyAuthLoginShortcutEnabled={dummyAuthLoginShortcutEnabled}
        message="Session expired. Sign in again to manage todos."
        messageRole="alert"
        onDummySignIn={principalId => void signIn(principalId)}
        onDummySignUp={displayName => void signUp(displayName)}
      />
    )
  }

  return (
    <main className="todo-shell">
      <header className="todo-header">
        <Title />
        <div className="session-bar">
          <span>Signed in as {authSession.user.id}</span>
          <button onClick={() => void signOut()} type="button">
            Sign out
          </button>
        </div>
      </header>
      <fieldset className="todo-filter">
        <legend>Filter todos</legend>
        <label>
          <input
            aria-label="Show all todos"
            checked={filter === 'all'}
            name="todo-filter"
            onChange={() => setFilter('all')}
            type="radio"
            value="all"
          />
          All
        </label>
        <label>
          <input
            aria-label="Show completed todos"
            checked={filter === 'completed'}
            name="todo-filter"
            onChange={() => setFilter('completed')}
            type="radio"
            value="completed"
          />
          Completed
        </label>
        <label>
          <input
            aria-label="Show open todos"
            checked={filter === 'open'}
            name="todo-filter"
            onChange={() => setFilter('open')}
            type="radio"
            value="open"
          />
          Open
        </label>
      </fieldset>
      <TodoCreateForm onCreate={createTodo} />

      {loading ? <p className="todo-message">Loading todos...</p> : null}
      {error ? (
        <p className="todo-error" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="todo-list">
        {filteredTodos.map(todo => (
          <TodoItem key={todo.id} onComplete={completeTodo} onRename={renameTodo} onReopen={reopenTodo} todo={todo} />
        ))}
      </ul>
    </main>
  )
}
