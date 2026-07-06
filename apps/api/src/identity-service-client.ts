import type {
  AuthCapabilitiesResourceV1,
  AuthSignInInputV1,
  IdentityContractClientV1,
  IdentityTokenIssueInputV1,
  IdentityTokenIssueOutputV1,
} from '@megiddo/contracts'
import { createInstrumentedOrpcClientFetch, identityRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface IdentityServiceClient {
  getAuthCapabilities(): Promise<AuthCapabilitiesResourceV1>
  signIn(input: AuthSignInInputV1): Promise<IdentityTokenIssueOutputV1>
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
  const signInClient = createInstrumentedIdentityClient('v1.auth.signIn')
  const developmentIdentityTokensClient = createInstrumentedIdentityClient('v1.development.identityTokens.issue')

  return {
    getAuthCapabilities() {
      return authCapabilitiesClient.v1.auth.capabilities()
    },
    signIn(input) {
      return signInClient.v1.auth.signIn(input)
    },
    issueDevelopmentIdentityToken(input) {
      return developmentIdentityTokensClient.v1.development.identityTokens.issue(input)
    },
  }
}
