import { createRoot } from 'react-dom/client'
import { createFrontendApi } from './api/frontend-api-adapter'
import { createFrontendConfig, createFrontendEnv } from './env'
import './styles.css'
import { createTodoApp } from './todo-app'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Missing root element')
}

const env = createFrontendEnv({
  VITE_API_GATEWAY_BASE_URL: import.meta.env.VITE_API_GATEWAY_BASE_URL,
  VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: import.meta.env.VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT,
})
const config = createFrontendConfig(env)
const api = createFrontendApi({ baseUrl: config.apiGatewayBaseUrl })

createRoot(root).render(createTodoApp({ api, dummyAuthLoginShortcutEnabled: config.dummyAuthLoginShortcutEnabled }))
