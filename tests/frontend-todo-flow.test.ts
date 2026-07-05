import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp, createIdentityServiceClient, createTodoServiceClient } from '@megiddo/api'
import { createIdentityApp } from '@megiddo/identity'
import { createDevelopmentIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp as createTodoServiceApp } from '@megiddo/todo'
import { JSDOM } from 'jsdom'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createFrontendApi, type FrontendTodo } from '../apps/frontend/src/api/frontend-api-adapter'
import { createTodoApp as createFrontendTodoApp, type FrontendApi } from '../apps/frontend/src/todo-app'

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
  let todos: FrontendTodo[] = [{ id: 'todo-1', title: 'Existing todo', status: 'open' }]
  const getTodo = (id: string) => {
    const todo = todos.find(candidate => candidate.id === id)

    assert.ok(todo, `Expected todo ${id} to exist`)

    return todo
  }
  const api: FrontendApi = {
    async getGatewayStatus() {
      return { service: 'api-gateway', message: 'frontend is connected' }
    },
    async getAuthSession() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signInDevelopment() {
      return { state: 'logged-in', user: { id: 'dev:viewer' } }
    },
    async signOut() {
      return { state: 'logged-out' }
    },
    async listTodos() {
      calls.push('listTodos')
      return todos
    },
    async createTodo(input) {
      calls.push(`createTodo:${input.title}`)
      const todo: FrontendTodo = { id: 'todo-2', title: input.title, status: 'open' }
      todos = [...todos, todo]
      return todo
    },
    async completeTodo(input) {
      calls.push(`completeTodo:${input.id}`)
      todos = todos.map(todo => (todo.id === input.id ? { ...todo, status: 'completed' } : todo))
      return getTodo(input.id)
    },
    async reopenTodo(input) {
      calls.push(`reopenTodo:${input.id}`)
      todos = todos.map(todo => (todo.id === input.id ? { ...todo, status: 'open' } : todo))
      return getTodo(input.id)
    },
    async renameTodo(input) {
      calls.push(`renameTodo:${input.id}:${input.title}`)
      todos = todos.map(todo => (todo.id === input.id ? { ...todo, title: input.title } : todo))
      return getTodo(input.id)
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
      getElement<HTMLButtonElement>('button[aria-label="Complete Existing todo"]').click()
      await settle()
    })

    await waitForText(rootElement, /Completed/)

    await act(async () => {
      getElement<HTMLButtonElement>('button[aria-label="Reopen Existing todo"]').click()
      await settle()
    })

    const renameInput = getElement<HTMLInputElement>('input[aria-label="Rename Existing todo"]')
    await act(async () => {
      setInputValue(renameInput, 'Renamed existing todo')
      getElement<HTMLButtonElement>('button[aria-label="Save rename for Existing todo"]').click()
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

test('frontend renders auth session states through a fake Frontend API Adapter', async () => {
  const renderWithSession = async (session: Awaited<ReturnType<FrontendApi['getAuthSession']>>) => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
      url: 'http://localhost/',
    })
    const api: FrontendApi = {
      async getGatewayStatus() {
        return { service: 'api-gateway', message: 'frontend is connected' }
      },
      async getAuthSession() {
        return session
      },
      async signInDevelopment() {
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

      await waitForText(rootElement, /Todos|Sign in to manage todos|Session expired/)
      textContent = rootElement.textContent ?? ''
      await act(async () => root.unmount())
    })

    return textContent
  }

  assert.match(await renderWithSession({ state: 'logged-out' }), /Sign in to manage todos/)
  assert.match(await renderWithSession({ state: 'logged-in', user: { id: 'dev:viewer' } }), /Signed in as dev:viewer/)
  assert.match(await renderWithSession({ state: 'expired' }), /Session expired/)
})

test('production Frontend API Adapter delegates todo calls to the API Gateway oRPC client', async () => {
  const codec = createDevelopmentIdentityTokenCodec()
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
  const app = createApiGatewayApp({ identityClient, todoClient, tokenVerifier: codec })
  const api = createFrontendApi({
    baseUrl: 'http://api-gateway.test',
    fetch(request) {
      const url = new URL(request.url)
      return app.request(`${url.pathname}${url.search}`, request)
    },
  })

  await api.signInDevelopment()
  const created = await api.createTodo({ title: 'Create through frontend adapter' })
  const completed = await api.completeTodo({ id: created.id })
  const reopened = await api.reopenTodo({ id: created.id })
  const renamed = await api.renameTodo({ id: created.id, title: 'Rename through frontend adapter' })
  const todos = await api.listTodos()

  assert.deepEqual(created, { id: created.id, title: 'Create through frontend adapter', status: 'open' })
  assert.deepEqual(completed, { ...created, status: 'completed' })
  assert.deepEqual(reopened, created)
  assert.deepEqual(renamed, { ...created, title: 'Rename through frontend adapter' })
  assert.deepEqual(todos, [renamed])
})
