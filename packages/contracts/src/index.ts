import { oc } from '@orpc/contract'
import { z } from 'zod'

export const GatewayStatusResourceSchemaV1 = z.object({
  service: z.literal('api-gateway'),
  message: z.literal('frontend is connected'),
})

export type GatewayStatus = z.infer<typeof GatewayStatusResourceSchemaV1>

export const gatewayStatus = GatewayStatusResourceSchemaV1.parse({
  service: 'api-gateway',
  message: 'frontend is connected',
})

export const apiGatewayContractV1 = {
  gateway: {
    status: oc.output(GatewayStatusResourceSchemaV1),
  },
}

export type ApiGatewayContractV1 = typeof apiGatewayContractV1
