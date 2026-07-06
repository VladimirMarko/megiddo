import { createIdentityServiceConfig } from './config-builder'
import {
  createIdentityEnv,
  type IdentityAuthProviderMode,
  type IdentityRuntimeEnv,
  type IdentityTokenCodecMode,
} from './env-contract'

export type { IdentityAuthProviderMode, IdentityTokenCodecMode }

export interface IdentityModeConfig {
  authProvider: IdentityAuthProviderMode
  tokenCodec: IdentityTokenCodecMode
}

export const resolveIdentityModeConfig = (runtimeEnv: IdentityRuntimeEnv = process.env): IdentityModeConfig => {
  const config = createIdentityServiceConfig(createIdentityEnv(runtimeEnv))

  return { authProvider: config.authProvider, tokenCodec: config.tokenCodec }
}
