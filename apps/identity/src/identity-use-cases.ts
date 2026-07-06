import { randomUUID } from 'node:crypto'
import type {
  AuthCapabilitiesResourceV1,
  AuthSessionResourceV1,
  AuthSignInInputV1,
  AuthSignUpInputV1,
  BrowserSessionIdentityTokenIssueInputV1,
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

export class ExpiredBrowserSessionError extends Error {
  constructor(sessionId: string) {
    super(`Browser session is expired: ${sessionId}`)
  }
}

export class DisallowedServiceTokenAudienceError extends Error {
  constructor(callerService: string, audienceService: string) {
    super(`${callerService} cannot issue ${audienceService} Identity Tokens`)
  }
}

export class PasswordAuthError extends Error {}

export interface AuthProviderAdapter {
  supportsPasswordAuth?: boolean
  createBrowserSession(user: UserReferenceResourceV1): Promise<{ id: string }>
  createDummyPrincipal(input: DummyAuthAccountResourceV1): Promise<UserReferenceResourceV1>
  deleteBrowserSession(sessionId: string): Promise<void>
  listDummyAccounts(): Promise<DummyAuthAccountResourceV1[]>
  resolveBrowserSession(sessionId: string): Promise<UserReferenceResourceV1 | undefined>
  resolveDummyPrincipal(principalId: string): Promise<UserReferenceResourceV1 | undefined>
  resolveDevelopmentUser(subject?: string): Promise<UserReferenceResourceV1>
  signInWithPassword?(input: Extract<AuthSignInInputV1, { method: 'password' }>): Promise<BrowserSessionIssueOutputV1>
  signUpWithPassword?(input: Extract<AuthSignUpInputV1, { method: 'password' }>): Promise<BrowserSessionIssueOutputV1>
}

export interface IdentityUseCases {
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  getBrowserSession(sessionId: string): Promise<AuthSessionResourceV1>
  signIn(input: AuthSignInInputV1): Promise<BrowserSessionIssueOutputV1>
  signUp(input: AuthSignUpInputV1): Promise<BrowserSessionIssueOutputV1>
  signOut(sessionId: string): Promise<AuthSessionResourceV1>
  issueDevelopmentIdentityToken(input: IdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
  issueBrowserSessionIdentityToken(input: {
    callerService: string
    tokenRequest: BrowserSessionIdentityTokenIssueInputV1
  }): Promise<IdentityTokenIssueOutputV1>
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

const serviceTokenAudienceAllowlist = new Map([['api-gateway', new Set(['todo'])]])

const assertServiceTokenAudienceAllowed = (callerService: string, audienceService: string) => {
  if (!serviceTokenAudienceAllowlist.get(callerService)?.has(audienceService)) {
    throw new DisallowedServiceTokenAudienceError(callerService, audienceService)
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
    const passwordAuthAvailable = authProvider.supportsPasswordAuth === true
    const dummyAuthAvailable = accounts.length > 0 || !passwordAuthAvailable
    const signInMethods: AuthCapabilitiesResourceV1['signInMethods'] = accounts.length > 0 ? ['dummy'] : []
    const signUpMethods: AuthCapabilitiesResourceV1['signUpMethods'] = dummyAuthAvailable ? ['dummy'] : []

    if (passwordAuthAvailable) {
      signInMethods.push('password')
      signUpMethods.push('password')
    }

    const dummy = {
      accounts,
      signIn: accounts.length > 0 ? ('available' as const) : undefined,
      signUp: 'available' as const,
    }
    const password = { signIn: 'available' as const, signUp: 'available' as const }

    if (dummyAuthAvailable && passwordAuthAvailable) {
      return { dummy, password, signInMethods, signUpMethods }
    }

    if (dummyAuthAvailable) {
      return { dummy, signInMethods, signUpMethods }
    }

    if (passwordAuthAvailable) {
      return { password, signInMethods, signUpMethods }
    }

    return { signInMethods, signUpMethods }
  },
  async getBrowserSession(sessionId) {
    const user = await authProvider.resolveBrowserSession(sessionId)

    return user ? { state: 'logged-in', user } : { state: 'expired' }
  },
  async signIn(input) {
    if (input.method === 'password') {
      if (!authProvider.signInWithPassword) {
        throw new PasswordAuthError('Password sign-in is not available')
      }

      return authProvider.signInWithPassword(input)
    }

    const user = await authProvider.resolveDummyPrincipal(input.principalId)

    if (!user) {
      throw new UnknownPrincipalError(input.principalId)
    }

    return createBrowserSessionForUser({ authProvider, user })
  },
  async signUp(input) {
    if (input.method === 'password') {
      if (!authProvider.signUpWithPassword) {
        throw new PasswordAuthError('Password sign-up is not available')
      }

      return authProvider.signUpWithPassword(input)
    }

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
  async issueBrowserSessionIdentityToken({ callerService, tokenRequest }) {
    assertServiceTokenAudienceAllowed(callerService, tokenRequest.audience.service)

    const user = await authProvider.resolveBrowserSession(tokenRequest.sessionId)

    if (!user) {
      throw new ExpiredBrowserSessionError(tokenRequest.sessionId)
    }

    return issueIdentityTokenForUser({
      audience: tokenRequest.audience,
      contractVersion: tokenRequest.contractVersion,
      tokenSigner,
      user,
    })
  },
})
