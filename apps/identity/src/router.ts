import { identityContractV1, identityOperationalHealthV1 } from '@megiddo/contracts'
import { internalServiceHeader, internalServiceSecretHeader } from '@megiddo/platform'
import { implement, ORPCError } from '@orpc/server'
import type { IdentityUseCases } from './identity-use-cases'
import {
  DisallowedServiceTokenAudienceError,
  ExpiredBrowserSessionError,
  InvalidDummyDisplayNameError,
  PasswordAuthError,
  PrincipalCollisionError,
  UnknownPrincipalError,
} from './identity-use-cases'

interface IdentityContext {
  internalServiceAuthSecret: string
  request: Request
}

const identityV1 = implement<typeof identityContractV1, IdentityContext>(identityContractV1)

const requireInternalCallerService = ({ internalServiceAuthSecret, request }: IdentityContext) => {
  const callerService = request.headers.get(internalServiceHeader)
  const callerSecret = request.headers.get(internalServiceSecretHeader)

  if (!callerService || callerSecret !== internalServiceAuthSecret) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Internal service authentication required' })
  }

  return callerService
}

const toBrowserSessionIdentityTokenIssueError = (error: unknown) => {
  if (error instanceof DisallowedServiceTokenAudienceError) {
    return new ORPCError('FORBIDDEN', { message: error.message })
  }

  if (error instanceof ExpiredBrowserSessionError) {
    return new ORPCError('UNAUTHORIZED', { message: error.message })
  }

  return error
}

export const createIdentityRouter = (identity: IdentityUseCases) =>
  identityV1.router({
    v1: {
      development: {
        identityTokens: {
          issue: identityV1.v1.development.identityTokens.issue.handler(({ context, input }) => {
            requireInternalCallerService(context)

            return identity.issueDevelopmentIdentityToken(input)
          }),
        },
      },
      internal: {
        identityTokens: {
          issueForBrowserSession: identityV1.v1.internal.identityTokens.issueForBrowserSession.handler(
            async ({ context, input }) => {
              const callerService = requireInternalCallerService(context)

              try {
                return await identity.issueBrowserSessionIdentityToken({ callerService, tokenRequest: input })
              } catch (error) {
                throw toBrowserSessionIdentityTokenIssueError(error)
              }
            },
          ),
        },
      },
      auth: {
        capabilities: identityV1.v1.auth.capabilities.handler(() => identity.getAuthCapabilities()),
        current: identityV1.v1.auth.current.handler(({ input }) => identity.getBrowserSession(input.sessionId)),
        signIn: identityV1.v1.auth.signIn.handler(async ({ input }) => {
          try {
            return await identity.signIn(input)
          } catch (error) {
            if (error instanceof UnknownPrincipalError || error instanceof PasswordAuthError) {
              throw new ORPCError('BAD_REQUEST', { message: error.message })
            }

            throw error
          }
        }),
        signUp: identityV1.v1.auth.signUp.handler(async ({ input }) => {
          try {
            return await identity.signUp(input)
          } catch (error) {
            if (
              error instanceof PrincipalCollisionError ||
              error instanceof InvalidDummyDisplayNameError ||
              error instanceof PasswordAuthError
            ) {
              throw new ORPCError('BAD_REQUEST', { message: error.message })
            }

            throw error
          }
        }),
        signOut: identityV1.v1.auth.signOut.handler(({ input }) => identity.signOut(input.sessionId)),
      },
      operational: {
        health: identityV1.v1.operational.health.handler(() => identityOperationalHealthV1),
      },
    },
  })

export type IdentityRouter = ReturnType<typeof createIdentityRouter>
