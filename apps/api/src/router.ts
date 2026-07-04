import { apiGatewayContractV1, gatewayStatus } from '@megiddo/contracts'
import { implement } from '@orpc/server'

const apiGatewayV1 = implement(apiGatewayContractV1)

export const apiGatewayRouter = apiGatewayV1.router({
  v1: {
    gateway: {
      status: apiGatewayV1.v1.gateway.status.handler(() => gatewayStatus),
    },
  },
})

export type ApiGatewayRouter = typeof apiGatewayRouter
