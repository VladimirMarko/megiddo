import { join, resolve } from 'node:path'
import {
  createLocalDevResetScriptEnv,
  createLocalDevScriptEnv,
  createTelemetryViewerScriptEnv,
  type LocalDevResetScriptEnv,
  type LocalDevScriptEnv,
  type ScriptRuntimeEnv,
  type TelemetryViewerScriptEnv,
} from './script-env-contract.mjs'

export { createLocalDevResetScriptEnv, createLocalDevScriptEnv, createTelemetryViewerScriptEnv }

export interface ScriptConfigOptions {
  workspaceRoot: string
}

export interface LocalDevScriptConfig {
  apiPort: string
  dataDirectory: string
  frontendPort: string
  identityPort: string
  todoPort: string
}

export interface LocalDevResetScriptConfig {
  dataDirectory: string
  dataDirectoryWasConfigured: boolean
  workspaceDataRoot: string
}

export interface TelemetryViewerScriptConfig {
  otlpHttpPort: string
  viewerBinary: string
}

const formatPort = (port: number) => String(port)

export const createLocalDevScriptConfig = (
  env: LocalDevScriptEnv,
  { workspaceRoot }: ScriptConfigOptions,
): LocalDevScriptConfig => ({
  apiPort: formatPort(env.API_PORT),
  dataDirectory: env.MEGIDDO_LOCAL_DATA_DIR ?? join(workspaceRoot, '.data', 'local-dev'),
  frontendPort: formatPort(env.FRONTEND_PORT),
  identityPort: formatPort(env.IDENTITY_PORT),
  todoPort: formatPort(env.TODO_PORT),
})

export const createLocalDevResetScriptConfig = (
  env: LocalDevResetScriptEnv,
  { workspaceRoot }: ScriptConfigOptions,
): LocalDevResetScriptConfig => {
  const defaultDataDirectory = join(workspaceRoot, '.data', 'local-dev')
  const configuredDataDirectory = env.MEGIDDO_LOCAL_DATA_DIR

  return {
    dataDirectory: resolve(configuredDataDirectory ?? defaultDataDirectory),
    dataDirectoryWasConfigured: configuredDataDirectory !== undefined,
    workspaceDataRoot: resolve(workspaceRoot, '.data'),
  }
}

export const createTelemetryViewerScriptConfig = (env: TelemetryViewerScriptEnv): TelemetryViewerScriptConfig => ({
  otlpHttpPort: formatPort(env.PORT ?? env.OTEL_GUI_PORT ?? 4318),
  viewerBinary: env.OTEL_GUI_BIN ?? 'otel-gui',
})

export type { LocalDevResetScriptEnv, LocalDevScriptEnv, ScriptRuntimeEnv, TelemetryViewerScriptEnv }
