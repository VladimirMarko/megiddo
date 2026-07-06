import { identityContractV1, identityOperationalHealthV1 } from '@megiddo/contracts'
import { implement, ORPCError } from '@orpc/server'
import type { IdentityUseCases } from './identity-use-cases'
import { InvalidDummyDisplayNameError, PrincipalCollisionError, UnknownPrincipalError } from './identity-use-cases'

const identityV1 = implement(identityContractV1)

export const createIdentityRouter = (identity: IdentityUseCases) =>
  identityV1.router({
    v1: {
      development: {
        identityTokens: {
          issue: identityV1.v1.development.identityTokens.issue.handler(({ input }) =>
            identity.issueDevelopmentIdentityToken(input),
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
            if (error instanceof UnknownPrincipalError) {
              throw new ORPCError('BAD_REQUEST', { message: error.message })
            }

            throw error
          }
        }),
        signUp: identityV1.v1.auth.signUp.handler(async ({ input }) => {
          try {
            return await identity.signUp(input)
          } catch (error) {
            if (error instanceof PrincipalCollisionError || error instanceof InvalidDummyDisplayNameError) {
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
