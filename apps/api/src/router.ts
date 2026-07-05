import {
  type ApiGatewayContractV1,
  apiGatewayAudienceV1,
  apiGatewayContractV1,
  type GatewayTodoByIdInputV1,
  type GatewayTodoCreateInputV1,
  type GatewayTodoRenameInputV1,
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

const withTodoIdentityToken = async <Input extends object>(
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
      viewer: {
        session: {
          current: apiGatewayV1.v1.viewer.session.current.handler(({ context }) =>
            readGatewaySession(tokenVerifier, context.request),
          ),
          signInDevelopment: apiGatewayV1.v1.viewer.session.signInDevelopment.handler(async ({ input }) => {
            const issued = await identityClient.issueDevelopmentIdentityToken({
              audience: apiGatewayAudienceV1,
              contractVersion: 'v1',
              subject: input?.subject,
            })

            return { identityToken: issued.identityToken, state: 'logged-in' as const, user: issued.user }
          }),
          signOut: apiGatewayV1.v1.viewer.session.signOut.handler(() => ({ state: 'logged-out' as const })),
        },
        todos: {
          list: apiGatewayV1.v1.viewer.todos.list.handler(async ({ context }) =>
            todoClient.listTodos(await withTodoIdentityToken(identityClient, tokenVerifier, context.request, {})),
          ),
          create: apiGatewayV1.v1.viewer.todos.create.handler(
            async ({ context, input }: { context: ApiGatewayContext; input: GatewayTodoCreateInputV1 }) =>
              todoClient.createTodo(await withTodoIdentityToken(identityClient, tokenVerifier, context.request, input)),
          ),
          complete: apiGatewayV1.v1.viewer.todos.complete.handler(
            async ({ context, input }: { context: ApiGatewayContext; input: GatewayTodoByIdInputV1 }) =>
              todoClient.completeTodo(
                await withTodoIdentityToken(identityClient, tokenVerifier, context.request, input),
              ),
          ),
          reopen: apiGatewayV1.v1.viewer.todos.reopen.handler(
            async ({ context, input }: { context: ApiGatewayContext; input: GatewayTodoByIdInputV1 }) =>
              todoClient.reopenTodo(await withTodoIdentityToken(identityClient, tokenVerifier, context.request, input)),
          ),
          rename: apiGatewayV1.v1.viewer.todos.rename.handler(
            async ({ context, input }: { context: ApiGatewayContext; input: GatewayTodoRenameInputV1 }) =>
              todoClient.renameTodo(await withTodoIdentityToken(identityClient, tokenVerifier, context.request, input)),
          ),
        },
      },
    },
  })

export type ApiGatewayRouter = ReturnType<typeof createApiGatewayRouter>
