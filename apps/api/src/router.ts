import {
  type ApiGatewayContractV1,
  apiGatewayContractV1,
  apiGatewayOperationalHealthV1,
  type BrowserSessionIssueOutputV1,
  gatewayStatus,
  todoServiceAudienceV1,
} from '@megiddo/contracts'
import { implement, ORPCError } from '@orpc/server'
import type { IdentityServiceClient } from './identity-service-client'
import type { TodoServiceClient } from './todo-service-client'

interface ApiGatewayContext {
  request: Request
  responseHeaders: Headers
}

const apiGatewayV1 = implement<ApiGatewayContractV1, ApiGatewayContext>(apiGatewayContractV1)

export const apiGatewayBrowserSessionCookieName = 'megiddo_session'

const cookieValue = (request: Request, name: string) => {
  const cookie = request.headers.get('cookie')

  if (!cookie) {
    return undefined
  }

  for (const part of cookie.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')

    if (rawKey === name) {
      return rawValue.join('=') || undefined
    }
  }

  return undefined
}

const browserSessionId = (request: Request) => cookieValue(request, apiGatewayBrowserSessionCookieName)

const setBrowserSessionCookie = (headers: Headers, sessionId: string) => {
  headers.append('set-cookie', `${apiGatewayBrowserSessionCookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax`)
}

const clearBrowserSessionCookie = (headers: Headers) => {
  headers.append('set-cookie', `${apiGatewayBrowserSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

const toLoggedInGatewaySession = (issued: BrowserSessionIssueOutputV1) => ({
  state: 'logged-in' as const,
  user: issued.user,
})

const readGatewaySession = async (identityClient: IdentityServiceClient, request: Request) => {
  const sessionId = browserSessionId(request)

  if (!sessionId) {
    return { state: 'logged-out' as const }
  }

  return identityClient.resolveBrowserSession({ sessionId })
}

const requireGatewaySession = async (identityClient: IdentityServiceClient, request: Request) => {
  const session = await readGatewaySession(identityClient, request)

  if (session.state !== 'logged-in') {
    throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
  }

  return session
}

const issueTodoIdentityToken = async (identityClient: IdentityServiceClient, subject: string) =>
  (
    await identityClient.issueDevelopmentIdentityToken({
      audience: todoServiceAudienceV1,
      contractVersion: 'v1',
      subject,
    })
  ).identityToken

const createAuthenticatedTodoInput = async <Input extends object>(
  identityClient: IdentityServiceClient,
  request: Request,
  input: Input,
) => ({
  ...input,
  identityToken: await issueTodoIdentityToken(
    identityClient,
    (await requireGatewaySession(identityClient, request)).user.id,
  ),
})

const createTodoInputForRequest =
  (identityClient: IdentityServiceClient, request: Request) =>
  <Input extends object>(input: Input) =>
    createAuthenticatedTodoInput(identityClient, request, input)

export const createApiGatewayRouter = ({
  identityClient,
  todoClient,
}: {
  identityClient: IdentityServiceClient
  todoClient: TodoServiceClient
}) =>
  apiGatewayV1.router({
    v1: {
      gateway: {
        status: apiGatewayV1.v1.gateway.status.handler(() => gatewayStatus),
      },
      operational: {
        health: apiGatewayV1.v1.operational.health.handler(() => apiGatewayOperationalHealthV1),
      },
      viewer: {
        session: {
          current: apiGatewayV1.v1.viewer.session.current.handler(({ context }) =>
            readGatewaySession(identityClient, context.request),
          ),
          capabilities: apiGatewayV1.v1.viewer.session.capabilities.handler(() => identityClient.getAuthCapabilities()),
          signIn: apiGatewayV1.v1.viewer.session.signIn.handler(async ({ context, input }) => {
            const issued = await identityClient.createBrowserSession(input)
            setBrowserSessionCookie(context.responseHeaders, issued.browserSession.id)

            return toLoggedInGatewaySession(issued)
          }),
          signUp: apiGatewayV1.v1.viewer.session.signUp.handler(async ({ context, input }) => {
            const issued = await identityClient.createBrowserSessionForSignUp(input)
            setBrowserSessionCookie(context.responseHeaders, issued.browserSession.id)

            return toLoggedInGatewaySession(issued)
          }),
          signOut: apiGatewayV1.v1.viewer.session.signOut.handler(async ({ context }) => {
            const sessionId = browserSessionId(context.request)

            if (sessionId) {
              await identityClient.deleteBrowserSession({ sessionId })
            }

            clearBrowserSessionCookie(context.responseHeaders)

            return { state: 'logged-out' as const }
          }),
        },
        todos: {
          list: apiGatewayV1.v1.viewer.todos.list.handler(async ({ context }) => {
            const todoInput = createTodoInputForRequest(identityClient, context.request)

            return todoClient.listTodos(await todoInput({}))
          }),
          create: apiGatewayV1.v1.viewer.todos.create.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, context.request)

            return todoClient.createTodo(await todoInput(input))
          }),
          complete: apiGatewayV1.v1.viewer.todos.complete.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, context.request)

            return todoClient.completeTodo(await todoInput(input))
          }),
          reopen: apiGatewayV1.v1.viewer.todos.reopen.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, context.request)

            return todoClient.reopenTodo(await todoInput(input))
          }),
          rename: apiGatewayV1.v1.viewer.todos.rename.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, context.request)

            return todoClient.renameTodo(await todoInput(input))
          }),
        },
      },
    },
  })

export type ApiGatewayRouter = ReturnType<typeof createApiGatewayRouter>
