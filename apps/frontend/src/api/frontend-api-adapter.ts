import type { ApiGatewayContractV1, GatewayStatus } from '@megiddo/contracts'
import { apiGatewayRpcUrl } from '@megiddo/platform'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface FrontendApi {
  getGatewayStatus(): Promise<GatewayStatus>
}

export const createFrontendApi = (baseUrl = 'http://localhost:3000'): FrontendApi => {
  const link = new RPCLink({ url: apiGatewayRpcUrl(baseUrl) })
  const client = createORPCClient<ApiGatewayContractV1>(link)

  return {
    getGatewayStatus() {
      return client.v1.gateway.status()
    },
  }
}
