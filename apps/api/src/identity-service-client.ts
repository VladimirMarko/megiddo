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
  const link = new RPCLink({
    fetch: createInstrumentedOrpcClientFetch({
      fetch,
      procedure: 'v1.development.identityTokens.issue',
      serviceName,
    }),
    url: identityRpcUrl(baseUrl),
  })
  const client = createORPCClient<IdentityContractClientV1>(link)

  return {
    getAuthCapabilities() {
      return client.v1.auth.capabilities()
    },
    signIn(input) {
      return client.v1.auth.signIn(input)
    },
    issueDevelopmentIdentityToken(input) {
      return client.v1.development.identityTokens.issue(input)
    },
  }
}
