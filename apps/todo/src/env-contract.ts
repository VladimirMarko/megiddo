import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type TodoRuntimeEnv = Record<string, string | boolean | number | undefined>

export const todoIdentityTokenCodecSchema = z.enum(['dummy', 'jwt-jws'])

const megiddoAuthProfileSchema = z.enum(['local-dummy'])

export const createTodoEnv = (runtimeEnv: TodoRuntimeEnv) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv,
    server: {
      IDENTITY_TOKEN_CODEC: todoIdentityTokenCodecSchema.optional(),
      MEGIDDO_AUTH_PROFILE: megiddoAuthProfileSchema.optional(),
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: z.string().optional(),
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
      TODO_DATABASE_PATH: z.string().min(1).default('.data/todo/todo.sqlite'),
    },
  })

export type TodoEnv = ReturnType<typeof createTodoEnv>
export type TodoIdentityTokenCodec = z.infer<typeof todoIdentityTokenCodecSchema>
