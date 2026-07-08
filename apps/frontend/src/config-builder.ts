import type { FrontendEnv } from './env-contract'

export interface FrontendConfig {
  apiGatewayBaseUrl: string
  dummyAuthLoginShortcutEnabled: boolean
}

export const createFrontendConfig = (env: FrontendEnv): FrontendConfig => ({
  apiGatewayBaseUrl: env.VITE_API_GATEWAY_BASE_URL ?? 'http://localhost:3000',
  dummyAuthLoginShortcutEnabled: env.VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT === 'enabled',
})
