import {
  type ApiGatewayContractV1,
  apiGatewayContractV1,
  apiGatewayOperationalHealthV1,
  type BrowserSessionIssueOutputV1,
  gatewayStatus,
  type OperationalHealthResourceV1,
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

const requireBrowserSessionId = (request: Request) => {
  const sessionId = browserSessionId(request)

  if (!sessionId) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Authentication required' })
  }

  return sessionId
}

type ApiGatewayDependencyService = 'identity' | 'todo'

const dependencyHealthReason = (service: ApiGatewayDependencyService, health: OperationalHealthResourceV1) => {
  if (health.status === 'ready') {
    return undefined
  }

  return `${service} health returned ${health.status}: ${health.reasons.join('; ')}`
}

const unreachableDependencyHealthReason = (service: ApiGatewayDependencyService, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)

  return `${service} health unavailable: ${message}`
}

const dependencyHealthResultReason = (
  service: ApiGatewayDependencyService,
  result: PromiseSettledResult<OperationalHealthResourceV1>,
) => {
  if (result.status === 'fulfilled') {
    return dependencyHealthReason(service, result.value)
  }

  return unreachableDependencyHealthReason(service, result.reason)
}

export const createApiGatewayOperationalHealth = async ({
  identityClient,
  todoClient,
}: {
  identityClient: IdentityServiceClient
  todoClient: TodoServiceClient
}): Promise<OperationalHealthResourceV1> => {
  const [identityHealth, todoHealth] = await Promise.allSettled([
    identityClient.getOperationalHealth(),
    todoClient.getOperationalHealth(),
  ])
  const reasons = [
    dependencyHealthResultReason('identity', identityHealth),
    dependencyHealthResultReason('todo', todoHealth),
  ].filter((reason): reason is string => reason !== undefined)
  const [firstReason, ...otherReasons] = reasons

  if (firstReason) {
    return { reasons: [firstReason, ...otherReasons], service: 'api-gateway', status: 'degraded' }
  }

  return apiGatewayOperationalHealthV1
}

const issueTodoIdentityToken = async (identityClient: IdentityServiceClient, sessionId: string) =>
  (
    await identityClient.issueBrowserSessionIdentityToken({
      audience: todoServiceAudienceV1,
      contractVersion: 'v1',
      sessionId,
    })
  ).identityToken

const createAuthenticatedTodoInput = async <Input extends object>(
  identityClient: IdentityServiceClient,
  request: Request,
  input: Input,
) => ({
  ...input,
  identityToken: await issueTodoIdentityToken(identityClient, requireBrowserSessionId(request)),
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
        health: apiGatewayV1.v1.operational.health.handler(() =>
          createApiGatewayOperationalHealth({ identityClient, todoClient }),
        ),
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
