import { tcpPortEnvSchema } from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type ScriptRuntimeEnv = Record<string, string | boolean | number | undefined>

const localDevScriptEnvSchema = {
  API_PORT: tcpPortEnvSchema.default(3000),
  FRONTEND_PORT: tcpPortEnvSchema.default(5173),
  IDENTITY_PORT: tcpPortEnvSchema.default(3002),
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
  TODO_PORT: tcpPortEnvSchema.default(3001),
}

const localDevResetScriptEnvSchema = {
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
}

const telemetryViewerScriptEnvSchema = {
  OTEL_GUI_BIN: z.string().min(1).optional(),
  OTEL_GUI_PORT: tcpPortEnvSchema.optional(),
  PORT: tcpPortEnvSchema.optional(),
}

export const createLocalDevScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...createEnv({ runtimeEnv, server: localDevScriptEnvSchema }),
})

export const createLocalDevResetScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...createEnv({ runtimeEnv, server: localDevResetScriptEnvSchema }),
})

export const createTelemetryViewerScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  OTEL_GUI_BIN: undefined,
  OTEL_GUI_PORT: undefined,
  PORT: undefined,
  ...createEnv({ runtimeEnv, server: telemetryViewerScriptEnvSchema }),
})

export type LocalDevResetScriptEnv = ReturnType<typeof createLocalDevResetScriptEnv>
export type LocalDevScriptEnv = ReturnType<typeof createLocalDevScriptEnv>
export type TelemetryViewerScriptEnv = ReturnType<typeof createTelemetryViewerScriptEnv>
