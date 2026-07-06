import {
  identityTokenCodecEnvSchema,
  localDummyAuthProfileEnvSchema,
  tcpPortEnvSchema,
} from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type TodoRuntimeEnv = Record<string, string | boolean | number | undefined>

export const todoIdentityTokenCodecSchema = identityTokenCodecEnvSchema

export const createTodoEnv = (runtimeEnv: TodoRuntimeEnv) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      IDENTITY_TOKEN_CODEC: todoIdentityTokenCodecSchema.optional(),
      MEGIDDO_AUTH_PROFILE: localDummyAuthProfileEnvSchema.optional(),
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
      PORT: tcpPortEnvSchema.default(3001),
      TODO_DATABASE_PATH: z.string().min(1).default('.data/todo/todo.sqlite'),
    },
  })

export type TodoEnv = ReturnType<typeof createTodoEnv>
export type TodoIdentityTokenCodec = z.infer<typeof todoIdentityTokenCodecSchema>
