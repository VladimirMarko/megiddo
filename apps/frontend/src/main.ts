import { createFrontendApi } from './api/frontend-api-adapter'

const root = document.querySelector<HTMLDivElement>('#root')

if (!root) {
  throw new Error('Missing root element')
}

const api = createFrontendApi()
root.textContent = 'Loading API Gateway status...'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'API Gateway status request failed'

api
  .getGatewayStatus()
  .then(status => {
    root.textContent = `${status.service}: ${status.message}`
  })
  .catch((error: unknown) => {
    root.textContent = getErrorMessage(error)
  })
