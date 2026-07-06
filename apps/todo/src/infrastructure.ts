import {
  createDummyIdentityTokenCodec,
  createJwtJwsIdentityTokenCodec,
  type IdentityTokenVerifier,
} from '@megiddo/platform'
import { createEmbeddedTodoRepository, type EmbeddedTodoRepository } from './embedded-todo-repository'
import type { TodoServiceConfig } from './env'

export interface TodoServiceInfrastructure {
  close(): void
  repository: EmbeddedTodoRepository
  tokenVerifier: IdentityTokenVerifier
}

const createTodoTokenVerifier = (config: TodoServiceConfig): IdentityTokenVerifier => {
  if (config.identityTokenCodec === 'dummy') {
    return createDummyIdentityTokenCodec()
  }

  return createJwtJwsIdentityTokenCodec({
    env: {
      MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: config.identityTokenPublicKeyPemBase64,
    },
  })
}

export const createTodoServiceInfrastructure = (config: TodoServiceConfig): TodoServiceInfrastructure => {
  const repository = createEmbeddedTodoRepository({ databasePath: config.databasePath })

  return {
    close() {
      repository.close()
    },
    repository,
    tokenVerifier: createTodoTokenVerifier(config),
  }
}
