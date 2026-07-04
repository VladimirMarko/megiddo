import { apiGatewayContractV1 } from '@megiddo/contracts'
import { implement } from '@orpc/server'
import { gatewayStatusV1Adapter } from './gateway-status'

const apiGatewayContractV1Implementer = implement(apiGatewayContractV1)

export const apiGatewayRouter = apiGatewayContractV1Implementer.router({
  v1: {
    gateway: {
      status: apiGatewayContractV1Implementer.v1.gateway.status.handler(() => gatewayStatusV1Adapter()),
    },
  },
})

export type ApiGatewayRouter = typeof apiGatewayRouter
