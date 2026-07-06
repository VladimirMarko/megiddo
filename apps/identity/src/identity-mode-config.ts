export type IdentityAuthProviderMode = 'better-auth' | 'dummy'
export type IdentityTokenCodecMode = 'dummy' | 'jwt-jws'

export interface IdentityModeConfig {
  authProvider: IdentityAuthProviderMode
  tokenCodec: IdentityTokenCodecMode
}

const authProviderModes = ['dummy', 'better-auth'] as const
const tokenCodecModes = ['dummy', 'jwt-jws'] as const

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

  if ((allowed as readonly string[]).includes(value)) {
    return value as Mode
  }

  throw new Error(`${name} must be one of: ${allowed.join(', ')}`)
}

export const resolveIdentityModeConfig = (env: NodeJS.ProcessEnv = process.env): IdentityModeConfig => {
  const profile = env.MEGIDDO_AUTH_PROFILE

  if (profile !== undefined && profile !== 'local-dummy') {
    throw new Error('MEGIDDO_AUTH_PROFILE must be one of: local-dummy')
  }

  const profileDefaults: IdentityModeConfig =
    profile === 'local-dummy'
      ? { authProvider: 'dummy', tokenCodec: 'dummy' }
      : { authProvider: 'dummy', tokenCodec: 'dummy' }

  const authProvider =
    parseMode({ allowed: authProviderModes, name: 'IDENTITY_AUTH_PROVIDER', value: env.IDENTITY_AUTH_PROVIDER }) ??
    profileDefaults.authProvider
  const tokenCodec =
    parseMode({ allowed: tokenCodecModes, name: 'IDENTITY_TOKEN_CODEC', value: env.IDENTITY_TOKEN_CODEC }) ??
    profileDefaults.tokenCodec

  if (env.NODE_ENV === 'production' && authProvider === 'dummy') {
    throw new Error('IDENTITY_AUTH_PROVIDER=dummy is not allowed when NODE_ENV=production')
  }

  if (env.NODE_ENV === 'production' && tokenCodec === 'dummy') {
    throw new Error('IDENTITY_TOKEN_CODEC=dummy is not allowed when NODE_ENV=production')
  }

  return { authProvider, tokenCodec }
}
