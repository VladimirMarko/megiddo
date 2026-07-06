import type { ApiGatewayEnv } from './env-contract'

export interface ApiGatewayServiceConfig {
  identityInternalServiceAuthSecret: string
  identityServiceUrl: string
  port: number
  todoServiceUrl: string
}

export const createApiGatewayServiceConfig = (env: ApiGatewayEnv): ApiGatewayServiceConfig => ({
  identityInternalServiceAuthSecret: env.IDENTITY_INTERNAL_SERVICE_AUTH_SECRET,
  identityServiceUrl: env.IDENTITY_SERVICE_URL,
  port: env.PORT,
  todoServiceUrl: env.TODO_SERVICE_URL,
})
