import { join } from 'node:path'

export interface LocalDevTopologyOptions {
  apiPort: string
  dataDirectory: string
  frontendPort: string
  identityPort: string
  todoPort: string
}

export interface LocalDevProcessDefinition {
  args?: string[]
  env: NodeJS.ProcessEnv
  packageName: string
}

const createLocalTelemetryEnv = (serviceName: string): NodeJS.ProcessEnv => ({
  OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
  OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
  OTEL_SERVICE_NAME: serviceName,
  OTEL_TRACES_EXPORTER: 'otlp',
})

export const createLocalDevProcessDefinitions = ({
  apiPort,
  dataDirectory,
  frontendPort,
  identityPort,
  todoPort,
}: LocalDevTopologyOptions): LocalDevProcessDefinition[] => [
  {
    env: {
      ...createLocalTelemetryEnv('identity'),
      IDENTITY_DATABASE_PATH: join(dataDirectory, 'identity.sqlite'),
      MEGIDDO_AUTH_PROFILE: 'local-dummy',
      PORT: identityPort,
    },
    packageName: '@megiddo/identity',
  },
  {
    env: {
      ...createLocalTelemetryEnv('todo'),
      MEGIDDO_AUTH_PROFILE: 'local-dummy',
      PORT: todoPort,
      TODO_DATABASE_PATH: join(dataDirectory, 'todo.sqlite'),
    },
    packageName: '@megiddo/todo',
  },
  {
    env: {
      ...createLocalTelemetryEnv('api-gateway'),
      IDENTITY_SERVICE_URL: `http://localhost:${identityPort}`,
      PORT: apiPort,
      TODO_SERVICE_URL: `http://localhost:${todoPort}`,
    },
    packageName: '@megiddo/api',
  },
  {
    args: ['--port', frontendPort],
    env: {
      PORT: frontendPort,
      UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled',
      VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: 'enabled',
    },
    packageName: '@megiddo/frontend',
  },
]
