import { identityContractV1 } from '@megiddo/contracts'
import { implement } from '@orpc/server'
import type { IdentityUseCases } from './identity-use-cases'

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
    },
  })

export type IdentityRouter = ReturnType<typeof createIdentityRouter>
