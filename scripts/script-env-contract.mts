import { tcpPortEnvSchema } from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type ScriptRuntimeEnv = Record<string, string | boolean | number | undefined>
type ScriptEnvContract = Record<string, z.ZodType>

const localDevScriptEnvContract = {
  API_PORT: tcpPortEnvSchema.default(3000),
  FRONTEND_PORT: tcpPortEnvSchema.default(5173),
  IDENTITY_PORT: tcpPortEnvSchema.default(3002),
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
  TODO_PORT: tcpPortEnvSchema.default(3001),
} satisfies ScriptEnvContract

const localDevResetScriptEnvContract = {
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
} satisfies ScriptEnvContract

const telemetryViewerScriptEnvContract = {
  OTEL_GUI_BIN: z.string().min(1).optional(),
  OTEL_GUI_PORT: tcpPortEnvSchema.optional(),
  PORT: tcpPortEnvSchema.optional(),
} satisfies ScriptEnvContract

export const createLocalDevScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...createEnv({ runtimeEnv, server: localDevScriptEnvContract }),
})

export const createLocalDevResetScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...createEnv({ runtimeEnv, server: localDevResetScriptEnvContract }),
})

export const createTelemetryViewerScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  OTEL_GUI_BIN: undefined,
  OTEL_GUI_PORT: undefined,
  PORT: undefined,
  ...createEnv({ runtimeEnv, server: telemetryViewerScriptEnvContract }),
})

export type LocalDevResetScriptEnv = ReturnType<typeof createLocalDevResetScriptEnv>
export type LocalDevScriptEnv = ReturnType<typeof createLocalDevScriptEnv>
export type TelemetryViewerScriptEnv = ReturnType<typeof createTelemetryViewerScriptEnv>
