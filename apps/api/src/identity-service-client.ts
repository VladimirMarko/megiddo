import type {
  AuthCapabilitiesResourceV1,
  AuthSessionResourceV1,
  AuthSignInInputV1,
  AuthSignUpInputV1,
  BrowserSessionIdentityTokenIssueInputV1,
  BrowserSessionInputV1,
  BrowserSessionIssueOutputV1,
  IdentityContractClientV1,
  IdentityTokenIssueInputV1,
  IdentityTokenIssueOutputV1,
  OperationalHealthResourceV1,
} from '@megiddo/contracts'
import {
  createInstrumentedOrpcClientFetch,
  defaultInternalServiceAuthSecret,
  identityRpcUrl,
  internalServiceHeader,
  internalServiceSecretHeader,
} from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface IdentityServiceClient {
  getOperationalHealth(): Promise<OperationalHealthResourceV1>
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  createBrowserSession(input: AuthSignInInputV1): Promise<BrowserSessionIssueOutputV1>
  createBrowserSessionForSignUp(input: AuthSignUpInputV1): Promise<BrowserSessionIssueOutputV1>
  resolveBrowserSession(input: BrowserSessionInputV1): Promise<AuthSessionResourceV1>
  deleteBrowserSession(input: BrowserSessionInputV1): Promise<AuthSessionResourceV1>
  issueDevelopmentIdentityToken(input: IdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
  issueBrowserSessionIdentityToken(input: BrowserSessionIdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
}

interface IdentityServiceClientOptions {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
  internalServiceAuthSecret?: string
  serviceName?: string
}

interface InstrumentedIdentityClientOptions {
  withInternalServiceAuth?: boolean
}

export const createIdentityServiceClient = ({
  baseUrl = 'http://localhost:3002',
  fetch,
  internalServiceAuthSecret = defaultInternalServiceAuthSecret,
  serviceName = 'api-gateway',
}: IdentityServiceClientOptions = {}): IdentityServiceClient => {
  const withInternalServiceAuth = (request: Request) => {
    const headers = new Headers(request.headers)
    headers.set(internalServiceHeader, serviceName)
    headers.set(internalServiceSecretHeader, internalServiceAuthSecret)

    return new Request(request, { headers })
  }

  const createInstrumentedIdentityClient = (
    procedure: string,
    { withInternalServiceAuth: shouldAuthenticateInternalService = false }: InstrumentedIdentityClientOptions = {},
  ) => {
    const instrumentedFetch = createInstrumentedOrpcClientFetch({ fetch, procedure, serviceName })

    return createORPCClient<IdentityContractClientV1>(
      new RPCLink({
        fetch: request => {
          const authenticatedRequest = shouldAuthenticateInternalService ? withInternalServiceAuth(request) : request

          return instrumentedFetch(authenticatedRequest)
        },
        url: identityRpcUrl(baseUrl),
      }),
    )
  }

  const authCapabilitiesClient = createInstrumentedIdentityClient('v1.auth.capabilities')
  const operationalHealthClient = createInstrumentedIdentityClient('v1.operational.health')
  const currentClient = createInstrumentedIdentityClient('v1.auth.current')
  const signInClient = createInstrumentedIdentityClient('v1.auth.signIn')
  const signUpClient = createInstrumentedIdentityClient('v1.auth.signUp')
  const signOutClient = createInstrumentedIdentityClient('v1.auth.signOut')
  const developmentIdentityTokensClient = createInstrumentedIdentityClient('v1.development.identityTokens.issue', {
    withInternalServiceAuth: true,
  })
  const browserSessionIdentityTokensClient = createInstrumentedIdentityClient(
    'v1.internal.identityTokens.issueForBrowserSession',
    { withInternalServiceAuth: true },
  )

  return {
    getOperationalHealth() {
      return operationalHealthClient.v1.operational.health()
    },
    getAuthCapabilities() {
      return authCapabilitiesClient.v1.auth.capabilities()
    },
    createBrowserSession(input) {
      return signInClient.v1.auth.signIn(input)
    },
    createBrowserSessionForSignUp(input) {
      return signUpClient.v1.auth.signUp(input)
    },
    resolveBrowserSession(input) {
      return currentClient.v1.auth.current(input)
    },
    deleteBrowserSession(input) {
      return signOutClient.v1.auth.signOut(input)
    },
    issueDevelopmentIdentityToken(input) {
      return developmentIdentityTokensClient.v1.development.identityTokens.issue(input)
    },
    issueBrowserSessionIdentityToken(input) {
      return browserSessionIdentityTokensClient.v1.internal.identityTokens.issueForBrowserSession(input)
    },
  }
}
