import type {
  AuthCapabilitiesResourceV1,
  AuthSessionResourceV1,
  AuthSignInInputV1,
  AuthSignUpInputV1,
  BrowserSessionInputV1,
  BrowserSessionIssueOutputV1,
  IdentityContractClientV1,
  IdentityTokenIssueInputV1,
  IdentityTokenIssueOutputV1,
} from '@megiddo/contracts'
import { createInstrumentedOrpcClientFetch, identityRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface IdentityServiceClient {
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  createBrowserSession(input: AuthSignInInputV1): Promise<BrowserSessionIssueOutputV1>
  createBrowserSessionForSignUp(input: AuthSignUpInputV1): Promise<BrowserSessionIssueOutputV1>
  resolveBrowserSession(input: BrowserSessionInputV1): Promise<AuthSessionResourceV1>
  deleteBrowserSession(input: BrowserSessionInputV1): Promise<AuthSessionResourceV1>
  issueDevelopmentIdentityToken(input: IdentityTokenIssueInputV1): Promise<IdentityTokenIssueOutputV1>
}

interface IdentityServiceClientOptions {
  baseUrl?: string
  fetch?: (request: Request) => Promise<Response>
  serviceName?: string
}

export const createIdentityServiceClient = ({
  baseUrl = 'http://localhost:3002',
  fetch,
  serviceName = 'api-gateway',
}: IdentityServiceClientOptions = {}): IdentityServiceClient => {
  const createInstrumentedIdentityClient = (procedure: string) =>
    createORPCClient<IdentityContractClientV1>(
      new RPCLink({
        fetch: createInstrumentedOrpcClientFetch({ fetch, procedure, serviceName }),
        url: identityRpcUrl(baseUrl),
      }),
    )
  const authCapabilitiesClient = createInstrumentedIdentityClient('v1.auth.capabilities')
  const currentClient = createInstrumentedIdentityClient('v1.auth.current')
  const signInClient = createInstrumentedIdentityClient('v1.auth.signIn')
  const signUpClient = createInstrumentedIdentityClient('v1.auth.signUp')
  const signOutClient = createInstrumentedIdentityClient('v1.auth.signOut')
  const developmentIdentityTokensClient = createInstrumentedIdentityClient('v1.development.identityTokens.issue')

  return {
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
  }
}
