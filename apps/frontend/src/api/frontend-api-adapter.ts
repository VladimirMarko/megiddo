import type {
  ApiGatewayContractV1,
  AuthCapabilitiesResourceV1,
  AuthSessionResourceV1,
  GatewayAuthSignInInputV1,
  GatewayAuthSignUpInputV1,
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
export type FrontendAuthCapabilities = AuthCapabilitiesResourceV1

export type FrontendTodoStatus = 'open' | 'completed'

export interface FrontendTodo {
  id: string
  title: string
  status: FrontendTodoStatus
}

export interface FrontendApi {
  getGatewayStatus(): Promise<GatewayStatus>
  getAuthCapabilities(): Promise<FrontendAuthCapabilities>
  getAuthSession(): Promise<FrontendAuthSession>
  signIn(input: GatewayAuthSignInInputV1): Promise<FrontendAuthSession>
  signUp(input: GatewayAuthSignUpInputV1): Promise<FrontendAuthSession>
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
  const fetchWithSession = async (request: Request) =>
    (fetch ?? globalThis.fetch)(new Request(request, { credentials: 'include' }))
  const link = new RPCLink({ fetch: fetchWithSession, url: apiGatewayRpcUrl(baseUrl) })
  const client = createORPCClient<ApiGatewayContractV1>(link)
  const toFrontendSession = (session: AuthSessionResourceV1): FrontendAuthSession => {
    if (session.state !== 'logged-in') {
      return session
    }

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
    getAuthCapabilities() {
      return client.v1.viewer.session.capabilities()
    },
    async getAuthSession() {
      return toFrontendSession(await client.v1.viewer.session.current())
    },
    async signIn(input) {
      return toFrontendSession(await client.v1.viewer.session.signIn(input))
    },
    async signUp(input) {
      return toFrontendSession(await client.v1.viewer.session.signUp(input))
    },
    async signOut() {
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
