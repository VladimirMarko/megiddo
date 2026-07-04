import type { ApiGatewayContractV1, GatewayStatus } from '@megiddo/contracts'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

export interface FrontendApi {
  getGatewayStatus(): Promise<GatewayStatus>
}

const apiGatewayRpcUrl = (baseUrl: string) => `${baseUrl.replace(/\/$/, '')}/rpc`

export const createFrontendApi = (baseUrl = 'http://localhost:3000'): FrontendApi => {
  const link = new RPCLink({ url: apiGatewayRpcUrl(baseUrl) })
  const client = createORPCClient<ApiGatewayContractV1>(link)

  return {
    getGatewayStatus() {
      return client.v1.gateway.status()
    },
  }
}
