export type IdentityAuthProviderMode = 'better-auth' | 'dummy'
export type IdentityTokenCodecMode = 'dummy' | 'jwt-jws'

export interface IdentityModeConfig {
  authProvider: IdentityAuthProviderMode
  tokenCodec: IdentityTokenCodecMode
}

const authProviderModes = ['dummy', 'better-auth'] as const
const authProfiles = ['local-dummy'] as const
const tokenCodecModes = ['dummy', 'jwt-jws'] as const
const localDummyModeConfig: IdentityModeConfig = { authProvider: 'dummy', tokenCodec: 'dummy' }

const parseMode = <Mode extends string>({
  allowed,
  name,
  value,
}: {
  allowed: readonly Mode[]
  name: string
  value: string | undefined
}) => {
  if (value === undefined) {
    return undefined
  }

  const mode = allowed.find(mode => mode === value)

  if (mode !== undefined) {
    return mode
  }

  throw new Error(`${name} must be one of: ${allowed.join(', ')}`)
}

export const resolveIdentityModeConfig = (env: NodeJS.ProcessEnv = process.env): IdentityModeConfig => {
  parseMode({ allowed: authProfiles, name: 'MEGIDDO_AUTH_PROFILE', value: env.MEGIDDO_AUTH_PROFILE })

  const authProvider =
    parseMode({ allowed: authProviderModes, name: 'IDENTITY_AUTH_PROVIDER', value: env.IDENTITY_AUTH_PROVIDER }) ??
    localDummyModeConfig.authProvider
  const tokenCodec =
    parseMode({ allowed: tokenCodecModes, name: 'IDENTITY_TOKEN_CODEC', value: env.IDENTITY_TOKEN_CODEC }) ??
    localDummyModeConfig.tokenCodec

  if (env.NODE_ENV === 'production' && authProvider === 'dummy') {
    throw new Error('IDENTITY_AUTH_PROVIDER=dummy is not allowed when NODE_ENV=production')
  }

  if (env.NODE_ENV === 'production' && tokenCodec === 'dummy') {
    throw new Error('IDENTITY_TOKEN_CODEC=dummy is not allowed when NODE_ENV=production')
  }

  return { authProvider, tokenCodec }
}
