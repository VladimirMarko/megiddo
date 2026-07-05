import type {
  ApiGatewayContractV1,
  AuthSessionResourceV1,
  GatewayAuthSignInInputV1,
  GatewayStatus,
  GatewayTodoByIdInputV1,
  GatewayTodoCreateInputV1,
  GatewayTodoRenameInputV1,
  TodoResourceV1,
} from '@megiddo/contracts'
import { apiGatewayRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

type FrontendLoggedInSession = Extract<AuthSessionResourceV1, { state: 'logged-in' }>

export type FrontendAuthSession =
  | Exclude<AuthSessionResourceV1, { state: 'logged-in' }>
  | {
      state: 'logged-in'
      user: FrontendLoggedInSession['user']
    }

export interface FrontendTodo {
  id: string
  title: string
  status: 'open' | 'completed'
}

export interface FrontendApi {
  getGatewayStatus(): Promise<GatewayStatus>
  getAuthSession(): Promise<FrontendAuthSession>
  signInDevelopment(input?: GatewayAuthSignInInputV1): Promise<FrontendAuthSession>
  signOut(): Promise<FrontendAuthSession>
  listTodos(): Promise<FrontendTodo[]>
  createTodo(input: GatewayTodoCreateInputV1): Promise<FrontendTodo>
  completeTodo(input: GatewayTodoByIdInputV1): Promise<FrontendTodo>
  reopenTodo(input: GatewayTodoByIdInputV1): Promise<FrontendTodo>
  renameTodo(input: GatewayTodoRenameInputV1): Promise<FrontendTodo>
}

interface FrontendApiOptions {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
}

export const createFrontendApi = ({
  baseUrl = 'http://localhost:3000',
  fetch,
}: FrontendApiOptions = {}): FrontendApi => {
  const fetchWithAuth = async (request: Request) => {
    const nextRequest = authIdentityToken
      ? new Request(request, {
          headers: { ...Object.fromEntries(request.headers), authorization: `Bearer ${authIdentityToken}` },
        })
      : request

    return (fetch ?? globalThis.fetch)(nextRequest)
  }
  let authIdentityToken: string | undefined
  const link = new RPCLink({ fetch: fetchWithAuth, url: apiGatewayRpcUrl(baseUrl) })
  const client = createORPCClient<ApiGatewayContractV1>(link)
  const toFrontendSession = (session: AuthSessionResourceV1): FrontendAuthSession => {
    if (session.state !== 'logged-in') {
      if (session.state === 'expired') {
        authIdentityToken = undefined
      }

      return session
    }

    authIdentityToken = session.identityToken ?? authIdentityToken

    return { state: 'logged-in', user: session.user }
  }
  const toFrontendTodo = (todo: TodoResourceV1): FrontendTodo => ({
    id: todo.id,
    title: todo.title,
    status: todo.completed ? 'completed' : 'open',
  })

  return {
    getGatewayStatus() {
      return client.v1.gateway.status()
    },
    async getAuthSession() {
      return toFrontendSession(await client.v1.viewer.session.current())
    },
    async signInDevelopment(input) {
      return toFrontendSession(await client.v1.viewer.session.signInDevelopment(input))
    },
    async signOut() {
      authIdentityToken = undefined
      return toFrontendSession(await client.v1.viewer.session.signOut())
    },
    async listTodos() {
      return (await client.v1.viewer.todos.list()).map(toFrontendTodo)
    },
    async createTodo(input) {
      return toFrontendTodo(await client.v1.viewer.todos.create(input))
    },
    async completeTodo(input) {
      return toFrontendTodo(await client.v1.viewer.todos.complete(input))
    },
    async reopenTodo(input) {
      return toFrontendTodo(await client.v1.viewer.todos.reopen(input))
    },
    async renameTodo(input) {
      return toFrontendTodo(await client.v1.viewer.todos.rename(input))
    },
  }
}
