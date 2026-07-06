import {
  type ApiGatewayContractV1,
  apiGatewayAudienceV1,
  apiGatewayContractV1,
  apiGatewayOperationalHealthV1,
  gatewayStatus,
  todoServiceAudienceV1,
} from '@megiddo/contracts'
import type { IdentityTokenVerifier } from '@megiddo/platform'
import { implement, ORPCError } from '@orpc/server'
import type { IdentityServiceClient } from './identity-service-client'
import type { TodoServiceClient } from './todo-service-client'

interface ApiGatewayContext {
  request: Request
}

const apiGatewayV1 = implement<ApiGatewayContractV1, ApiGatewayContext>(apiGatewayContractV1)

const bearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return undefined
  }

  return authorization.slice('Bearer '.length)
}

const readGatewaySession = async (tokenVerifier: IdentityTokenVerifier, request: Request) => {
  const identityToken = bearerToken(request)

  if (!identityToken) {
    return { state: 'logged-out' as const }
  }

  try {
    const claims = await tokenVerifier.verifyIdentityToken({ audience: apiGatewayAudienceV1, identityToken })
    return { state: 'logged-in' as const, user: { id: claims.subject } }
  } catch {
    return { state: 'expired' as const }
  }
}

const requireGatewaySession = async (tokenVerifier: IdentityTokenVerifier, request: Request) => {
  const session = await readGatewaySession(tokenVerifier, request)

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

const createTodoIdentityInput = async <Input extends object>(
  identityClient: IdentityServiceClient,
  tokenVerifier: IdentityTokenVerifier,
  request: Request,
  input: Input,
) => ({
  ...input,
  identityToken: await issueTodoIdentityToken(
    identityClient,
    (await requireGatewaySession(tokenVerifier, request)).user.id,
  ),
})

const createTodoInputForRequest =
  (identityClient: IdentityServiceClient, tokenVerifier: IdentityTokenVerifier, request: Request) =>
  <Input extends object>(input: Input) =>
    createTodoIdentityInput(identityClient, tokenVerifier, request, input)

export const createApiGatewayRouter = ({
  identityClient,
  tokenVerifier,
  todoClient,
}: {
  identityClient: IdentityServiceClient
  tokenVerifier: IdentityTokenVerifier
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
            readGatewaySession(tokenVerifier, context.request),
          ),
          capabilities: apiGatewayV1.v1.viewer.session.capabilities.handler(() => identityClient.getAuthCapabilities()),
          signIn: apiGatewayV1.v1.viewer.session.signIn.handler(async ({ input }) => {
            const issued = await identityClient.signIn({
              audience: apiGatewayAudienceV1,
              contractVersion: 'v1',
              method: input.method,
              principalId: input.principalId,
            })

            return { identityToken: issued.identityToken, state: 'logged-in' as const, user: issued.user }
          }),
          signOut: apiGatewayV1.v1.viewer.session.signOut.handler(() => ({ state: 'logged-out' as const })),
        },
        todos: {
          list: apiGatewayV1.v1.viewer.todos.list.handler(async ({ context }) => {
            const todoInput = createTodoInputForRequest(identityClient, tokenVerifier, context.request)

            return todoClient.listTodos(await todoInput({}))
          }),
          create: apiGatewayV1.v1.viewer.todos.create.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, tokenVerifier, context.request)

            return todoClient.createTodo(await todoInput(input))
          }),
          complete: apiGatewayV1.v1.viewer.todos.complete.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, tokenVerifier, context.request)

            return todoClient.completeTodo(await todoInput(input))
          }),
          reopen: apiGatewayV1.v1.viewer.todos.reopen.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, tokenVerifier, context.request)

            return todoClient.reopenTodo(await todoInput(input))
          }),
          rename: apiGatewayV1.v1.viewer.todos.rename.handler(async ({ context, input }) => {
            const todoInput = createTodoInputForRequest(identityClient, tokenVerifier, context.request)

            return todoClient.renameTodo(await todoInput(input))
          }),
        },
      },
    },
  })

export type ApiGatewayRouter = ReturnType<typeof createApiGatewayRouter>
