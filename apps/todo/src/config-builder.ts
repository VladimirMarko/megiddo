import type { TodoEnv, TodoIdentityTokenCodec } from './env-contract'

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
