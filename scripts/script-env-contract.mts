import { tcpPortEnvSchema } from '@megiddo/platform/env-schema-fragments'
import { z } from 'zod'

export type ScriptRuntimeEnv = Record<string, string | boolean | number | undefined>

const parseScriptEnv = <T,>(schema: z.ZodType<T>, runtimeEnv: ScriptRuntimeEnv): T => {
  const result = schema.safeParse(runtimeEnv)

  if (!result.success) {
    throw new Error(`Invalid environment variables: ${z.prettifyError(result.error)}`)
  }

  return result.data
}

const localDevScriptEnvSchema = z.object({
  API_PORT: tcpPortEnvSchema.default(3000),
  FRONTEND_PORT: tcpPortEnvSchema.default(5173),
  IDENTITY_PORT: tcpPortEnvSchema.default(3002),
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
  TODO_PORT: tcpPortEnvSchema.default(3001),
})

const localDevResetScriptEnvSchema = z.object({
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
})

const telemetryViewerScriptEnvSchema = z.object({
  OTEL_GUI_BIN: z.string().min(1).optional(),
  OTEL_GUI_PORT: tcpPortEnvSchema.optional(),
  PORT: tcpPortEnvSchema.optional(),
})

export const createLocalDevScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...parseScriptEnv(localDevScriptEnvSchema, runtimeEnv),
})

export const createLocalDevResetScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...parseScriptEnv(localDevResetScriptEnvSchema, runtimeEnv),
})

export const createTelemetryViewerScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  OTEL_GUI_BIN: undefined,
  OTEL_GUI_PORT: undefined,
  PORT: undefined,
  ...parseScriptEnv(telemetryViewerScriptEnvSchema, runtimeEnv),
})

export type LocalDevResetScriptEnv = ReturnType<typeof createLocalDevResetScriptEnv>
export type LocalDevScriptEnv = ReturnType<typeof createLocalDevScriptEnv>
export type TelemetryViewerScriptEnv = ReturnType<typeof createTelemetryViewerScriptEnv>
