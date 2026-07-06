import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type TodoRuntimeEnv = Record<string, string | boolean | number | undefined>

const identityTokenCodecSchema = z.enum(['dummy', 'jwt-jws'])
const megiddoAuthProfileSchema = z.enum(['local-dummy'])

export const createTodoEnv = (runtimeEnv: TodoRuntimeEnv) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      IDENTITY_TOKEN_CODEC: identityTokenCodecSchema.optional(),
      MEGIDDO_AUTH_PROFILE: megiddoAuthProfileSchema.optional(),
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
      TODO_DATABASE_PATH: z.string().min(1).default('.data/todo/todo.sqlite'),
    },
  })

export type TodoEnv = ReturnType<typeof createTodoEnv>
export type TodoIdentityTokenCodec = z.infer<typeof identityTokenCodecSchema>

export interface TodoServiceConfig {
  databasePath: string
  identityTokenCodec: TodoIdentityTokenCodec
  identityTokenPublicKeyPemBase64?: string
  port: number
}

const deriveIdentityTokenCodec = (env: TodoEnv): TodoIdentityTokenCodec => {
  if (env.IDENTITY_TOKEN_CODEC !== undefined) {
    return env.IDENTITY_TOKEN_CODEC
  }

  if (env.MEGIDDO_AUTH_PROFILE === 'local-dummy') {
    return 'dummy'
  }

  return 'jwt-jws'
}

export const createTodoServiceConfig = (env: TodoEnv): TodoServiceConfig => ({
  databasePath: env.TODO_DATABASE_PATH,
  identityTokenCodec: deriveIdentityTokenCodec(env),
  identityTokenPublicKeyPemBase64: env.MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64,
  port: env.PORT,
})
