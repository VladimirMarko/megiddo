import { type GatewayStatus, gatewayStatus } from '@megiddo/contracts'

export const getGatewayStatus = (): GatewayStatus => gatewayStatus

export const gatewayStatusV1Adapter = (): GatewayStatus => getGatewayStatus()
