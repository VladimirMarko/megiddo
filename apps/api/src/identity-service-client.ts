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

export const createIdentityServiceClient = ({
  baseUrl = 'http://localhost:3002',
  fetch,
  internalServiceAuthSecret = defaultInternalServiceAuthSecret,
  serviceName = 'api-gateway',
}: IdentityServiceClientOptions = {}): IdentityServiceClient => {
  const instrumentedFetch = createInstrumentedOrpcClientFetch({ fetch, serviceName })
  const url = identityRpcUrl(baseUrl)
  const publicClient = createORPCClient<IdentityContractClientV1>(new RPCLink({ fetch: instrumentedFetch, url }))
  const internalClient = createORPCClient<IdentityContractClientV1>(
    new RPCLink({
      fetch: instrumentedFetch,
      headers: {
        [internalServiceHeader]: serviceName,
        [internalServiceSecretHeader]: internalServiceAuthSecret,
      },
      url,
    }),
  )

  return {
    getOperationalHealth() {
      return publicClient.v1.operational.health()
    },
    getAuthCapabilities() {
      return publicClient.v1.auth.capabilities()
    },
    createBrowserSession(input) {
      return publicClient.v1.auth.signIn(input)
    },
    createBrowserSessionForSignUp(input) {
      return publicClient.v1.auth.signUp(input)
    },
    resolveBrowserSession(input) {
      return publicClient.v1.auth.current(input)
    },
    deleteBrowserSession(input) {
      return publicClient.v1.auth.signOut(input)
    },
    issueDevelopmentIdentityToken(input) {
      return internalClient.v1.development.identityTokens.issue(input)
    },
    issueBrowserSessionIdentityToken(input) {
      return internalClient.v1.internal.identityTokens.issueForBrowserSession(input)
    },
  }
}
