import { createIdentityEnv, createIdentityServiceConfig } from '@megiddo/identity'

export const identityServiceConfigFromEnv = (env: Parameters<typeof createIdentityEnv>[0]) =>
  createIdentityServiceConfig(createIdentityEnv(env))
