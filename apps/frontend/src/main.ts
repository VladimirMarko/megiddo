import { createRoot } from 'react-dom/client'
import { createFrontendApi } from './api/frontend-api-adapter'
import './styles.css'
import { createTodoApp } from './todo-app'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Missing root element')
}

const api = createFrontendApi()
const env = import.meta.env as Record<string, string | undefined>
const dummyAuthLoginShortcutEnabled =
  env.UI_DUMMY_AUTH_LOGIN_SHORTCUT === 'enabled' || env.VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT === 'enabled'

createRoot(root).render(createTodoApp({ api, dummyAuthLoginShortcutEnabled }))
