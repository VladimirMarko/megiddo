import { randomUUID } from 'node:crypto'
import type {
  AuthCapabilitiesResourceV1,
  AuthSessionResourceV1,
  AuthSignInInputV1,
  AuthSignUpInputV1,
  BrowserSessionIssueOutputV1,
  DummyAuthAccountResourceV1,
  IdentityTokenAudienceV1,
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

export class PrincipalCollisionError extends Error {
  constructor(principalId: string) {
    super(`Principal already exists: ${principalId}`)
  }
}

export class InvalidDummyDisplayNameError extends Error {
  constructor(displayName: string) {
    super(`Display name cannot create a dummy principal id: ${displayName}`)
  }
}

export interface AuthProviderAdapter {
  createBrowserSession(user: UserReferenceResourceV1): Promise<{ id: string }>
  createDummyPrincipal(input: DummyAuthAccountResourceV1): Promise<UserReferenceResourceV1>
  deleteBrowserSession(sessionId: string): Promise<void>
  listDummyAccounts(): Promise<DummyAuthAccountResourceV1[]>
  resolveBrowserSession(sessionId: string): Promise<UserReferenceResourceV1 | undefined>
  resolveDummyPrincipal(principalId: string): Promise<UserReferenceResourceV1 | undefined>
  resolveDevelopmentUser(subject?: string): Promise<UserReferenceResourceV1>
}

export interface IdentityUseCases {
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  getBrowserSession(sessionId: string): Promise<AuthSessionResourceV1>
  signIn(input: AuthSignInInputV1): Promise<BrowserSessionIssueOutputV1>
  signUp(input: AuthSignUpInputV1): Promise<BrowserSessionIssueOutputV1>
  signOut(sessionId: string): Promise<AuthSessionResourceV1>
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
  const browserSessions = new Map<string, string>()
  const resolveDummyPrincipal = (principalId: string) => {
    const account = principals.get(principalId)

    if (!account) {
      return undefined
    }

    return { displayName: account.displayName, id: account.principalId }
  }

  return {
    async createBrowserSession(user) {
      const id = randomUUID()
      browserSessions.set(id, user.id)

      return { id }
    },
    async createDummyPrincipal(account) {
      if (principals.has(account.principalId)) {
        throw new PrincipalCollisionError(account.principalId)
      }

      principals.set(account.principalId, account)

      return { displayName: account.displayName, id: account.principalId }
    },
    async deleteBrowserSession(sessionId) {
      browserSessions.delete(sessionId)
    },
    async listDummyAccounts() {
      return [...principals.values()]
    },
    async resolveBrowserSession(sessionId) {
      const principalId = browserSessions.get(sessionId)

      return principalId ? resolveDummyPrincipal(principalId) : undefined
    },
    async resolveDummyPrincipal(principalId) {
      return resolveDummyPrincipal(principalId)
    },
    async resolveDevelopmentUser(subject = 'dev:viewer') {
      return { id: subject }
    },
  }
}

const dummyPrincipalIdFromDisplayName = (displayName: string) => {
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    throw new InvalidDummyDisplayNameError(displayName)
  }

  return `dummy:${slug}`
}

const issueIdentityTokenForUser = async ({
  contractVersion,
  audience,
  tokenSigner,
  user,
}: {
  audience: IdentityTokenAudienceV1
  contractVersion?: string
  tokenSigner: IdentityTokenSigner
  user: UserReferenceResourceV1
}) => {
  const identityToken = await tokenSigner.issueIdentityToken({
    audience,
    contractVersion,
    subject: user.id,
  })

  return { identityToken, user }
}

const createBrowserSessionForUser = async ({
  authProvider,
  user,
}: {
  authProvider: AuthProviderAdapter
  user: UserReferenceResourceV1
}): Promise<BrowserSessionIssueOutputV1> => ({
  browserSession: await authProvider.createBrowserSession(user),
  user,
})

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
      dummy: {
        accounts,
        signIn: accounts.length > 0 ? 'available' : undefined,
        signUp: 'available',
      },
      signInMethods: accounts.length > 0 ? ['dummy'] : [],
      signUpMethods: ['dummy'],
    }
  },
  async getBrowserSession(sessionId) {
    const user = await authProvider.resolveBrowserSession(sessionId)

    return user ? { state: 'logged-in', user } : { state: 'expired' }
  },
  async signIn(input) {
    const user = await authProvider.resolveDummyPrincipal(input.principalId)

    if (!user) {
      throw new UnknownPrincipalError(input.principalId)
    }

    return createBrowserSessionForUser({ authProvider, user })
  },
  async signUp(input) {
    const principalId = dummyPrincipalIdFromDisplayName(input.displayName)
    const user = await authProvider.createDummyPrincipal({ displayName: input.displayName.trim(), principalId })

    return createBrowserSessionForUser({ authProvider, user })
  },
  async signOut(sessionId) {
    await authProvider.deleteBrowserSession(sessionId)

    return { state: 'logged-out' }
  },
  async issueDevelopmentIdentityToken(input) {
    const user = await authProvider.resolveDevelopmentUser(input.subject)

    return issueIdentityTokenForUser({
      audience: input.audience,
      contractVersion: input.contractVersion,
      tokenSigner,
      user,
    })
  },
})
