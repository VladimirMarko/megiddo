import { gatewayStatus } from '@megiddo/contracts'
import { os } from '@orpc/server'

export const apiGatewayRouter = {
  gateway: {
    status: os.handler(() => gatewayStatus),
  },
}

export type ApiGatewayRouter = typeof apiGatewayRouter
