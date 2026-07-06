import { defaultInternalServiceAuthSecret } from '@megiddo/platform'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type IdentityRuntimeEnv = Record<string, string | boolean | number | undefined>

export const identityAuthProviderSchema = z.enum(['dummy', 'better-auth'])
export const identityTokenCodecSchema = z.enum(['dummy', 'jwt-jws'])

const identityNodeEnvSchema = z.enum(['development', 'test', 'production'])
const identityAuthProfileSchema = z.enum(['local-dummy'])
const identityDummyAuthDemoAccountsSchema = z.enum(['enabled'])

export const createIdentityEnv = (runtimeEnv: IdentityRuntimeEnv) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      BETTER_AUTH_URL: z.string().optional(),
      IDENTITY_AUTH_PROVIDER: identityAuthProviderSchema.optional(),
      IDENTITY_BETTER_AUTH_BASE_URL: z.string().optional(),
      IDENTITY_BETTER_AUTH_DATABASE_PATH: z.string().min(1).default('.data/identity/better-auth.sqlite'),
      IDENTITY_DATABASE_PATH: z.string().min(1).default('.data/identity/identity.sqlite'),
      IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS: identityDummyAuthDemoAccountsSchema.optional(),
      IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: z.string().min(1).default(defaultInternalServiceAuthSecret),
      IDENTITY_TOKEN_CODEC: identityTokenCodecSchema.optional(),
      MEGIDDO_AUTH_PROFILE: identityAuthProfileSchema.optional(),
      MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: z.string().optional(),
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
      NODE_ENV: identityNodeEnvSchema.optional(),
      PORT: z.coerce.number().int().min(1).max(65535).default(3002),
    },
  })

export type IdentityEnv = ReturnType<typeof createIdentityEnv>
export type IdentityAuthProviderMode = z.infer<typeof identityAuthProviderSchema>
export type IdentityTokenCodecMode = z.infer<typeof identityTokenCodecSchema>
