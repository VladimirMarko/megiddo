import type { FrontendEnv } from './env-contract'

export interface FrontendConfig {
  dummyAuthLoginShortcutEnabled: boolean
}

export const createFrontendConfig = (env: FrontendEnv): FrontendConfig => ({
  dummyAuthLoginShortcutEnabled: env.VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT === 'enabled',
})
