import { defaultInternalServiceAuthSecret } from '@megiddo/platform'
import { tcpPortEnvSchema } from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type ApiGatewayRuntimeEnv = Record<string, string | boolean | number | undefined>

export const createApiGatewayEnv = (runtimeEnv: ApiGatewayRuntimeEnv) =>
  createEnv({
    runtimeEnv,
    server: {
      IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: z.string().min(1).default(defaultInternalServiceAuthSecret),
      IDENTITY_SERVICE_URL: z.string().url().default('http://localhost:3002'),
      PORT: tcpPortEnvSchema.default(3000),
      TODO_SERVICE_URL: z.string().url().default('http://localhost:3001'),
    },
  })

export type ApiGatewayEnv = ReturnType<typeof createApiGatewayEnv>
