import { defaultInternalServiceAuthSecret } from '@megiddo/platform'
import {
  enabledEnvFlagSchema,
  identityTokenCodecEnvSchema,
  localDummyAuthProfileEnvSchema,
  tcpPortEnvSchema,
} from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type IdentityRuntimeEnv = Record<string, string | boolean | number | undefined>

export const identityAuthProviderSchema = z.enum(['dummy', 'better-auth'])
export const identityTokenCodecSchema = identityTokenCodecEnvSchema

const identityNodeEnvSchema = z.enum(['development', 'test', 'production'])

export const createIdentityEnv = (runtimeEnv: IdentityRuntimeEnv) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      BETTER_AUTH_URL: z.string().optional(),
      BETTER_AUTH_SECRET: z.string().min(1).optional(),
      IDENTITY_AUTH_PROVIDER: identityAuthProviderSchema.optional(),
      IDENTITY_BETTER_AUTH_BASE_URL: z.string().optional(),
      IDENTITY_BETTER_AUTH_DATABASE_PATH: z.string().min(1).default('.data/identity/better-auth.sqlite'),
      IDENTITY_DATABASE_PATH: z.string().min(1).default('.data/identity/identity.sqlite'),
      IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS: enabledEnvFlagSchema.optional(),
      IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: z.string().min(1).default(defaultInternalServiceAuthSecret),
      IDENTITY_TOKEN_CODEC: identityTokenCodecSchema.optional(),
      MEGIDDO_AUTH_PROFILE: localDummyAuthProfileEnvSchema.optional(),
      MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: z.string().optional(),
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
      NODE_ENV: identityNodeEnvSchema.optional(),
      PORT: tcpPortEnvSchema.default(3002),
    },
  })

export type IdentityEnv = ReturnType<typeof createIdentityEnv>
export type IdentityAuthProviderMode = z.infer<typeof identityAuthProviderSchema>
export type IdentityTokenCodecMode = z.infer<typeof identityTokenCodecSchema>
