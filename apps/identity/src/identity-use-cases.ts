import type {
  AuthCapabilitiesResourceV1,
  AuthSignInInputV1,
  DummyAuthAccountResourceV1,
  IdentityTokenIssueInputV1,
  IdentityTokenIssueOutputV1,
  UserReferenceResourceV1,
} from '@megiddo/contracts'
import type { IdentityTokenSigner } from '@megiddo/platform'

export class UnknownPrincipalError extends Error {
  constructor(principalId: string) {
    super(`Unknown principal: ${principalId}`)
  }
}

export interface AuthProviderAdapter {
  listDummyAccounts(): Promise<DummyAuthAccountResourceV1[]>
  resolveDummyPrincipal(principalId: string): Promise<UserReferenceResourceV1 | undefined>
  resolveDevelopmentUser(subject?: string): Promise<UserReferenceResourceV1>
}

export interface IdentityUseCases {
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  signIn(input: AuthSignInInputV1): Promise<IdentityTokenIssueOutputV1>
  issueDevelopmentIdentityToken(input: IdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
}

export const dummyDemoAccounts = [
  { displayName: 'Alice', principalId: 'dummy:alice' },
  { displayName: 'Bob', principalId: 'dummy:bob' },
] satisfies DummyAuthAccountResourceV1[]

export const createDevelopmentAuthProviderAdapter = ({
  demoAccounts = dummyDemoAccounts,
}: {
  demoAccounts?: DummyAuthAccountResourceV1[]
} = {}): AuthProviderAdapter => {
  const principals = new Map(demoAccounts.map(account => [account.principalId, account]))

  return {
    async listDummyAccounts() {
      return [...principals.values()]
    },
    async resolveDummyPrincipal(principalId) {
      const account = principals.get(principalId)

      if (!account) {
        return undefined
      }

      return { displayName: account.displayName, id: account.principalId }
    },
    async resolveDevelopmentUser(subject = 'dev:viewer') {
      return { id: subject }
    },
  }
}

export const createIdentityUseCases = ({
  authProvider,
  tokenSigner,
}: {
  authProvider: AuthProviderAdapter
  tokenSigner: IdentityTokenSigner
}): IdentityUseCases => ({
  async getAuthCapabilities() {
    const accounts = await authProvider.listDummyAccounts()

    return {
      dummy: accounts.length > 0 ? { accounts, signIn: 'available' } : undefined,
      signInMethods: accounts.length > 0 ? ['dummy'] : [],
    }
  },
  async signIn(input) {
    const user = await authProvider.resolveDummyPrincipal(input.principalId)

    if (!user) {
      throw new UnknownPrincipalError(input.principalId)
    }

    const identityToken = await tokenSigner.issueIdentityToken({
      audience: input.audience,
      contractVersion: input.contractVersion,
      subject: user.id,
    })

    return { identityToken, user }
  },
  async issueDevelopmentIdentityToken(input) {
    const user = await authProvider.resolveDevelopmentUser(input.subject)
    const identityToken = await tokenSigner.issueIdentityToken({
      audience: input.audience,
      contractVersion: input.contractVersion,
      subject: user.id,
    })

    return { identityToken, user }
  },
})
