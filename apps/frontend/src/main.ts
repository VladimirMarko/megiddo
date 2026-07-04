import { createRoot } from 'react-dom/client'
import { createFrontendApi } from './api/frontend-api-adapter'
import { createTodoApp } from './todo-app'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Missing root element')
}

const api = createFrontendApi()
createRoot(root).render(createTodoApp({ api }))
