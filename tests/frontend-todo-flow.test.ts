import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp, createIdentityServiceClient, createTodoServiceClient } from '@megiddo/api'
import { createIdentityApp } from '@megiddo/identity'
import { createJwtJwsIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp as createTodoServiceApp } from '@megiddo/todo'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createFrontendApi, type FrontendTodo } from '../apps/frontend/src/api/frontend-api-adapter'
import { createFrontendConfig, createFrontendEnv } from '../apps/frontend/src/env'
import { createTodoApp as createFrontendTodoApp, type FrontendApi } from '../apps/frontend/src/todo-app'
import { createCookieJarFetch } from './support/cookie-jar-fetch'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))
const getWindow = (element: Element) => {
  const view = element.ownerDocument.defaultView

  assert.ok(view)

  return view
}
const setInputValue = (input: HTMLInputElement, value: string) => {
  const view = getWindow(input)
  const inputPrototype = view.HTMLInputElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(inputPrototype, 'value')?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new view.Event('input', { bubbles: true }))
  input.dispatchEvent(new view.Event('change', { bubbles: true }))
}
const getElement = <TElement extends Element>(selector: string) => {
  const element = document.querySelector<TElement>(selector)

  assert.ok(element, `Expected ${selector} to exist`)

  return element
}
const waitForText = async (rootElement: HTMLElement, pattern: RegExp) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (pattern.test(rootElement.textContent ?? '')) {
      return
    }

    await act(async () => {
      await settle()
    })
  }

  assert.match(rootElement.textContent ?? '', pattern)
}
const createTodoStore = (initialTodos: FrontendTodo[]) => {
  let todos = initialTodos
  const getTodo = (id: string) => {
    const todo = todos.find(candidate => candidate.id === id)

    assert.ok(todo, `Expected todo ${id} to exist`)

    return todo
  }

  return {
    add(todo: FrontendTodo) {
      todos = [...todos, todo]
    },
    complete(id: string) {
      todos = todos.map(todo => (todo.id === id ? { ...todo, status: 'completed' } : todo))
      return getTodo(id)
    },
    list() {
      return todos
    },
    rename(id: string, title: string) {
      todos = todos.map(todo => (todo.id === id ? { ...todo, title } : todo))
      return getTodo(id)
    },
    reopen(id: string) {
      todos = todos.map(todo => (todo.id === id ? { ...todo, status: 'open' } : todo))
      return getTodo(id)
    },
  }
}
const withBrowserGlobals = async (dom: JSDOM, run: () => Promise<void>) => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousSelf = globalThis.self
  const previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT

  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.self = dom.window as unknown as Window & typeof globalThis
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  try {
    await run()
  } finally {
    globalThis.window = previousWindow
    globalThis.document = previousDocument
    globalThis.self = previousSelf
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment
    dom.window.close()
  }
}

test('frontend todo flow renders and mutates todos through a fake Frontend API Adapter', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  const calls: string[] = []
  const todoStore = createTodoStore([{ id: 'todo-1', title: 'Existing todo', status: 'open' }])
  const api: FrontendApi = {
    async getGatewayStatus() {
      return { service: 'api-gateway', message: 'frontend is connected' }
    },
    async getAuthCapabilities() {
      return { signInMethods: [], signUpMethods: [] }
    },
    async getAuthSession() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signIn() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signUp() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signOut() {
      return { state: 'logged-out' }
    },
    async listTodos() {
      calls.push('listTodos')
      return todoStore.list()
    },
    async createTodo(input) {
      calls.push(`createTodo:${input.title}`)
      const todo: FrontendTodo = { id: 'todo-2', title: input.title, status: 'open' }
      todoStore.add(todo)
      return todo
    },
    async completeTodo(input) {
      calls.push(`completeTodo:${input.id}`)
      return todoStore.complete(input.id)
    },
    async reopenTodo(input) {
      calls.push(`reopenTodo:${input.id}`)
      return todoStore.reopen(input.id)
    },
    async renameTodo(input) {
      calls.push(`renameTodo:${input.id}:${input.title}`)
      return todoStore.rename(input.id, input.title)
    },
  }

  await withBrowserGlobals(dom, async () => {
    const rootElement = getElement<HTMLDivElement>('#root')
    const root = createRoot(rootElement)

    await act(async () => {
      root.render(createFrontendTodoApp({ api }))
      await settle()
    })

    await waitForText(rootElement, /Existing todo/)

    const titleInput = getElement<HTMLInputElement>('input[name="title"]')
    const createForm = getElement<HTMLFormElement>('form[aria-label="Create todo"]')
    await act(async () => {
      setInputValue(titleInput, 'Created from UI')
      createForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
      await settle()
    })

    await waitForText(rootElement, /Created from UI/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Complete Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Completed/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Reopen Existing todo"]').click()
      await settle()
    })

    await act(async () => {
      getElement<HTMLButtonElement>('button[aria-label="Edit Existing todo"]').click()
      await settle()
    })

    let renameInput = getElement<HTMLInputElement>('input[aria-label="Rename Existing todo"]')
    await act(async () => {
      setInputValue(renameInput, 'Cancelled rename')
      getElement<HTMLButtonElement>('button[aria-label="Cancel rename for Existing todo"]').click()
      await settle()
    })

    assert.doesNotMatch(rootElement.textContent ?? '', /Cancelled rename/)

    await act(async () => {
      getElement<HTMLButtonElement>('button[aria-label="Edit Existing todo"]').click()
      await settle()
    })

    renameInput = getElement<HTMLInputElement>('input[aria-label="Rename Existing todo"]')
    await act(async () => {
      setInputValue(renameInput, 'Renamed existing todo')
      getElement<HTMLButtonElement>('button[aria-label="Confirm rename for Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Renamed existing todo/)
    assert.deepEqual(calls, [
      'listTodos',
      'createTodo:Created from UI',
      'completeTodo:todo-1',
      'reopenTodo:todo-1',
      'renameTodo:todo-1:Renamed existing todo',
    ])

    await act(async () => root.unmount())
  })
})

test('frontend todo flow surfaces mutation failures through a fake Frontend API Adapter', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  const todoStore = createTodoStore([{ id: 'todo-1', title: 'Existing todo', status: 'open' }])
  const failures = new Set(['createTodo', 'completeTodo', 'reopenTodo', 'renameTodo'])
  const failOnce = (operation: string, message: string) => {
    if (failures.delete(operation)) {
      throw new Error(message)
    }
  }
  const api: FrontendApi = {
    async getGatewayStatus() {
      return { service: 'api-gateway', message: 'frontend is connected' }
    },
    async getAuthCapabilities() {
      return { signInMethods: [], signUpMethods: [] }
    },
    async getAuthSession() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signIn() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signUp() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signOut() {
      return { state: 'logged-out' }
    },
    async listTodos() {
      return todoStore.list()
    },
    async createTodo(input) {
      failOnce('createTodo', 'Create failed')

      const todo: FrontendTodo = { id: 'todo-2', title: input.title, status: 'open' }
      todoStore.add(todo)
      return todo
    },
    async completeTodo(input) {
      failOnce('completeTodo', 'Complete failed')
      return todoStore.complete(input.id)
    },
    async reopenTodo(input) {
      failOnce('reopenTodo', 'Reopen failed')
      return todoStore.reopen(input.id)
    },
    async renameTodo(input) {
      failOnce('renameTodo', 'Rename failed')
      return todoStore.rename(input.id, input.title)
    },
  }

  await withBrowserGlobals(dom, async () => {
    const rootElement = getElement<HTMLDivElement>('#root')
    const root = createRoot(rootElement)

    await act(async () => {
      root.render(createFrontendTodoApp({ api }))
      await settle()
    })

    await waitForText(rootElement, /Existing todo/)

    const titleInput = getElement<HTMLInputElement>('input[name="title"]')
    const createForm = getElement<HTMLFormElement>('form[aria-label="Create todo"]')
    await act(async () => {
      setInputValue(titleInput, 'Created after failure')
      createForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
      await settle()
    })

    await waitForText(rootElement, /Create failed/)

    await act(async () => {
      setInputValue(titleInput, 'Created after failure')
      createForm.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
      await settle()
    })

    await waitForText(rootElement, /Created after failure/)
    assert.doesNotMatch(rootElement.textContent ?? '', /Create failed/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Complete Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Complete failed/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Complete Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Completed/)
    assert.doesNotMatch(rootElement.textContent ?? '', /Complete failed/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Reopen Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Reopen failed/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Reopen Existing todo"]').click()
      await settle()
    })

    assert.doesNotMatch(rootElement.textContent ?? '', /Reopen failed/)

    await act(async () => {
      getElement<HTMLButtonElement>('button[aria-label="Edit Existing todo"]').click()
      await settle()
    })

    const renameInput = getElement<HTMLInputElement>('input[aria-label="Rename Existing todo"]')
    await act(async () => {
      setInputValue(renameInput, 'Renamed after failure')
      getElement<HTMLButtonElement>('button[aria-label="Confirm rename for Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Rename failed/)

    await act(async () => {
      getElement<HTMLButtonElement>('button[aria-label="Confirm rename for Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Renamed after failure/)
    assert.doesNotMatch(rootElement.textContent ?? '', /Rename failed/)

    await act(async () => root.unmount())
  })
})

test('frontend filters todos by completion status without reloading from the API', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  const todoStore = createTodoStore([
    { id: 'todo-1', title: 'Open todo', status: 'open' },
    { id: 'todo-2', title: 'Completed todo', status: 'completed' },
  ])
  const calls: string[] = []
  const api: FrontendApi = {
    async getGatewayStatus() {
      return { service: 'api-gateway', message: 'frontend is connected' }
    },
    async getAuthCapabilities() {
      return { signInMethods: [], signUpMethods: [] }
    },
    async getAuthSession() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signIn() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signUp() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signOut() {
      return { state: 'logged-out' }
    },
    async listTodos() {
      calls.push('listTodos')
      return todoStore.list()
    },
    async createTodo() {
      throw new Error('createTodo should not be called')
    },
    async completeTodo() {
      throw new Error('completeTodo should not be called')
    },
    async reopenTodo() {
      throw new Error('reopenTodo should not be called')
    },
    async renameTodo() {
      throw new Error('renameTodo should not be called')
    },
  }

  await withBrowserGlobals(dom, async () => {
    const rootElement = getElement<HTMLDivElement>('#root')
    const root = createRoot(rootElement)

    await act(async () => {
      root.render(createFrontendTodoApp({ api }))
      await settle()
    })

    await waitForText(rootElement, /Open todo/)
    assert.match(rootElement.textContent ?? '', /Completed todo/)
    assert.equal(document.querySelector('button[aria-label="Edit Completed todo"]'), null)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Show completed todos"]').click()
      await settle()
    })

    assert.doesNotMatch(rootElement.textContent ?? '', /Open todo/)
    assert.match(rootElement.textContent ?? '', /Completed todo/)

    await act(async () => {
      getElement<HTMLInputElement>('input[aria-label="Show open todos"]').click()
      await settle()
    })

    assert.match(rootElement.textContent ?? '', /Open todo/)
    assert.doesNotMatch(rootElement.textContent ?? '', /Completed todo/)
    assert.deepEqual(calls, ['listTodos'])

    await act(async () => root.unmount())
  })
})

test('frontend renders auth session states through a fake Frontend API Adapter', async () => {
  const renderWithSession = async (session: Awaited<ReturnType<FrontendApi['getAuthSession']>>) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost/',
    })
    const api: FrontendApi = {
      async getGatewayStatus() {
        return { service: 'api-gateway', message: 'frontend is connected' }
      },
      async getAuthCapabilities() {
        return { signInMethods: [], signUpMethods: [] }
      },
      async getAuthSession() {
        return session
      },
      async signIn() {
        return { state: 'logged-in', user: { id: 'dev:viewer' } }
      },
      async signUp() {
        return { state: 'logged-in', user: { id: 'dev:viewer' } }
      },
      async signOut() {
        return { state: 'logged-out' }
      },
      async listTodos() {
        return []
      },
      async createTodo() {
        throw new Error('createTodo should not be called')
      },
      async completeTodo() {
        throw new Error('completeTodo should not be called')
      },
      async reopenTodo() {
        throw new Error('reopenTodo should not be called')
      },
      async renameTodo() {
        throw new Error('renameTodo should not be called')
      },
    }

    let textContent = ''

    await withBrowserGlobals(dom, async () => {
      const rootElement = getElement<HTMLDivElement>('#root')
      const root = createRoot(rootElement)

      await act(async () => {
        root.render(createFrontendTodoApp({ api }))
        await settle()
      })

      await waitForText(rootElement, /Signed in as|Sign in to manage todos|Session expired/)
      textContent = rootElement.textContent ?? ''
      await act(async () => root.unmount())
    })

    return textContent
  }

  assert.match(await renderWithSession({ state: 'logged-out' }), /Sign in to manage todos/)
  assert.match(await renderWithSession({ state: 'logged-in', user: { id: 'dev:viewer' } }), /Signed in as dev:viewer/)
  assert.match(await renderWithSession({ state: 'expired' }), /Session expired/)
})

test('frontend renders dummy shortcuts conditionally and submits the dummy sign-up flow', async () => {
  const renderLoggedOut = async (runtimeEnv: Parameters<typeof createFrontendEnv>[0]) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost/',
    })
    const signIns: string[] = []
    const signUps: string[] = []
    const api: FrontendApi = {
      async getGatewayStatus() {
        return { service: 'api-gateway', message: 'frontend is connected' }
      },
      async getAuthCapabilities() {
        return {
          dummy: {
            accounts: [
              { displayName: 'Alice', principalId: 'dummy:alice' },
              { displayName: 'Bob', principalId: 'dummy:bob' },
            ],
            signIn: 'available',
            signUp: 'available',
          },
          signInMethods: ['dummy'],
          signUpMethods: ['dummy'],
        }
      },
      async getAuthSession() {
        return { state: 'logged-out' }
      },
      async signIn(input) {
        signIns.push(input.principalId)
        return { state: 'logged-in', user: { id: input.principalId } }
      },
      async signUp(input) {
        signUps.push(input.displayName)
        return { state: 'logged-in', user: { id: `dummy:${input.displayName.toLowerCase()}` } }
      },
      async signOut() {
        return { state: 'logged-out' }
      },
      async listTodos() {
        return []
      },
      async createTodo() {
        throw new Error('createTodo should not be called')
      },
      async completeTodo() {
        throw new Error('completeTodo should not be called')
      },
      async reopenTodo() {
        throw new Error('reopenTodo should not be called')
      },
      async renameTodo() {
        throw new Error('renameTodo should not be called')
      },
    }

    let textContent = ''

    await withBrowserGlobals(dom, async () => {
      const rootElement = getElement<HTMLDivElement>('#root')
      const root = createRoot(rootElement)
      const config = createFrontendConfig(createFrontendEnv(runtimeEnv))

      await act(async () => {
        root.render(createFrontendTodoApp({ api, dummyAuthLoginShortcutEnabled: config.dummyAuthLoginShortcutEnabled }))
        await settle()
      })

      await waitForText(rootElement, /Sign in to manage todos/)
      textContent = rootElement.textContent ?? ''

      if (config.dummyAuthLoginShortcutEnabled) {
        await act(async () => {
          getElement<HTMLButtonElement>('button').click()
          await settle()
        })
      } else {
        await act(async () => {
          setInputValue(getElement<HTMLInputElement>('input[aria-label="Display name"]'), 'Charlie Example')
          await settle()
        })

        await act(async () => {
          getElement<HTMLFormElement>('.auth-sign-up-form').dispatchEvent(
            new dom.window.Event('submit', { bubbles: true, cancelable: true }),
          )
          await settle()
        })
      }

      await act(async () => root.unmount())
    })

    return { signIns, signUps, textContent }
  }

  const disabled = await renderLoggedOut({ UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled' })
  assert.doesNotMatch(disabled.textContent, /Continue as Alice/)
  assert.match(disabled.textContent, /Create a local identity/)
  assert.match(disabled.textContent, /Sign up and continue/)
  assert.deepEqual(disabled.signIns, [])
  assert.deepEqual(disabled.signUps, ['Charlie Example'])

  const enabled = await renderLoggedOut({ VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled' })
  assert.match(enabled.textContent, /Continue as Alice/)
  assert.match(enabled.textContent, /Continue as Bob/)
  assert.deepEqual(enabled.signIns, ['dummy:alice'])
  assert.deepEqual(enabled.signUps, [])
})

test('production Frontend API Adapter delegates todo calls to the API Gateway oRPC client', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoServiceApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const app = createApiGatewayApp({ identityClient, todoClient })
  const api = createFrontendApi({
    baseUrl: 'http://api-gateway.test',
    fetch: createCookieJarFetch(request => {
      const url = new URL(request.url)
      return app.request(`${url.pathname}${url.search}`, request)
    }),
  })

  await api.signIn({ method: 'dummy', principalId: 'dummy:alice' })
  const created = await api.createTodo({ title: 'Create through frontend adapter' })
  const completed = await api.completeTodo({ id: created.id })
  const reopened = await api.reopenTodo({ id: created.id })
  const renamed = await api.renameTodo({ id: created.id, title: 'Rename through frontend adapter' })
  const aliceTodos = await api.listTodos()

  await api.signIn({ method: 'dummy', principalId: 'dummy:bob' })
  const bobCreated = await api.createTodo({ title: 'Bob owns this todo' })
  const bobTodos = await api.listTodos()

  await api.signIn({ method: 'dummy', principalId: 'dummy:alice' })
  const aliceTodosAfterBob = await api.listTodos()

  assert.deepEqual(created, { id: created.id, title: 'Create through frontend adapter', status: 'open' })
  assert.deepEqual(completed, { ...created, status: 'completed' })
  assert.deepEqual(reopened, created)
  assert.deepEqual(renamed, { ...created, title: 'Rename through frontend adapter' })
  assert.deepEqual(aliceTodos, [renamed])
  assert.deepEqual(bobCreated, { id: bobCreated.id, title: 'Bob owns this todo', status: 'open' })
  assert.deepEqual(bobTodos, [bobCreated])
  assert.deepEqual(aliceTodosAfterBob, [renamed])
})

test('Frontend API Adapter relies on browser session cookies instead of storing service tokens', async () => {
  const seenAuthorizationHeaders: Array<string | null> = []
  const api = createFrontendApi({
    baseUrl: 'http://api-gateway.test',
    async fetch(request) {
      const url = new URL(request.url)
      seenAuthorizationHeaders.push(request.headers.get('authorization'))

      if (url.pathname.endsWith('/v1/viewer/session/signIn')) {
        return Response.json({ json: { state: 'logged-in', user: { id: 'dummy:alice' } } })
      }

      if (url.pathname.endsWith('/v1/viewer/session/current')) {
        return Response.json({ json: { state: 'logged-in', user: { id: 'dummy:alice' } } })
      }

      if (url.pathname.endsWith('/v1/viewer/todos/list')) {
        return Response.json({ json: [] })
      }

      throw new Error(`Unexpected request: ${url.pathname}`)
    },
  })

  const signedIn = await api.signIn({ method: 'dummy', principalId: 'dummy:alice' })
  const current = await api.getAuthSession()
  const todos = await api.listTodos()

  assert.deepEqual(signedIn, { state: 'logged-in', user: { id: 'dummy:alice' } })
  assert.deepEqual(current, { state: 'logged-in', user: { id: 'dummy:alice' } })
  assert.deepEqual(todos, [])
  assert.deepEqual(seenAuthorizationHeaders, [null, null, null])
})

test('production Frontend API Adapter signs up a dummy principal and can select it later', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoServiceApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const app = createApiGatewayApp({ identityClient, todoClient })
  const api = createFrontendApi({
    baseUrl: 'http://api-gateway.test',
    fetch: createCookieJarFetch(request => {
      const url = new URL(request.url)
      return app.request(`${url.pathname}${url.search}`, request)
    }),
  })

  const signedUp = await api.signUp({ displayName: 'Charlie Example', method: 'dummy' })
  const created = await api.createTodo({ title: 'Charlie owns this todo' })
  const capabilities = await api.getAuthCapabilities()
  await api.signOut()
  const selectedLater = await api.signIn({ method: 'dummy', principalId: 'dummy:charlie-example' })
  const selectedLaterTodos = await api.listTodos()

  assert.deepEqual(signedUp, {
    state: 'logged-in',
    user: { displayName: 'Charlie Example', id: 'dummy:charlie-example' },
  })
  assert.deepEqual(created, { id: created.id, title: 'Charlie owns this todo', status: 'open' })
  assert.deepEqual(capabilities.dummy?.accounts.at(-1), {
    displayName: 'Charlie Example',
    principalId: 'dummy:charlie-example',
  })
  assert.deepEqual(selectedLater, {
    state: 'logged-in',
    user: { displayName: 'Charlie Example', id: 'dummy:charlie-example' },
  })
  assert.deepEqual(selectedLaterTodos, [created])
})

test('production Frontend API Adapter completes the Better Auth browser Todo flow', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({
    env: {
      IDENTITY_AUTH_PROVIDER: 'better-auth',
      IDENTITY_TOKEN_CODEC: 'dummy',
    },
    tokenSigner: codec,
  })
  const todoApp = createTodoServiceApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const app = createApiGatewayApp({ identityClient, todoClient })
  const api = createFrontendApi({
    baseUrl: 'http://api-gateway.test',
    fetch: createCookieJarFetch(request => {
      const url = new URL(request.url)
      return app.request(`${url.pathname}${url.search}`, request)
    }),
  })

  const capabilities = await api.getAuthCapabilities()
  const signedUp = await api.signUp({
    displayName: 'Better Auth Pat',
    email: 'better-auth-pat@example.com',
    method: 'password',
    password: 'password123',
  })
  const created = await api.createTodo({ title: 'Better Auth owns this todo' })
  const current = await api.getAuthSession()
  await api.signOut()
  const signedOut = await api.getAuthSession()
  const signedIn = await api.signIn({
    email: 'better-auth-pat@example.com',
    method: 'password',
    password: 'password123',
  })
  const todosAfterSignIn = await api.listTodos()

  assert.deepEqual(capabilities, {
    password: {
      signIn: 'available',
      signUp: 'available',
    },
    signInMethods: ['password'],
    signUpMethods: ['password'],
  })
  assert.equal(signedUp.state, 'logged-in')
  assert.equal(signedUp.user.displayName, 'Better Auth Pat')
  assert.deepEqual(created, { id: created.id, title: 'Better Auth owns this todo', status: 'open' })
  assert.deepEqual(current, signedUp)
  assert.deepEqual(signedOut, { state: 'logged-out' })
  assert.deepEqual(signedIn, signedUp)
  assert.deepEqual(todosAfterSignIn, [created])
})
