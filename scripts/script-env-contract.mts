import { z } from 'zod'

export type ScriptRuntimeEnv = Record<string, string | boolean | number | undefined>

const tcpPortSchema = z.coerce.number().int().min(1).max(65535)

const parseScriptEnv = <T,>(schema: z.ZodType<T>, runtimeEnv: ScriptRuntimeEnv): T => {
  const result = schema.safeParse(runtimeEnv)

  if (!result.success) {
    throw new Error(`Invalid environment variables: ${z.prettifyError(result.error)}`)
  }

  return result.data
}

const localDevScriptEnvSchema = z.object({
  API_PORT: tcpPortSchema.default(3000),
  FRONTEND_PORT: tcpPortSchema.default(5173),
  IDENTITY_PORT: tcpPortSchema.default(3002),
  MEGIDDO_LOCAL_DATA_DIR: z.string().min(1).optional(),
  TODO_PORT: tcpPortSchema.default(3001),
})

const telemetryViewerScriptEnvSchema = z.object({
  OTEL_GUI_BIN: z.string().min(1).optional(),
  OTEL_GUI_PORT: tcpPortSchema.optional(),
  PORT: tcpPortSchema.optional(),
})

export const createLocalDevScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  MEGIDDO_LOCAL_DATA_DIR: undefined,
  ...parseScriptEnv(localDevScriptEnvSchema, runtimeEnv),
})

export const createTelemetryViewerScriptEnv = (runtimeEnv: ScriptRuntimeEnv) => ({
  OTEL_GUI_BIN: undefined,
  OTEL_GUI_PORT: undefined,
  PORT: undefined,
  ...parseScriptEnv(telemetryViewerScriptEnvSchema, runtimeEnv),
})

export type LocalDevScriptEnv = ReturnType<typeof createLocalDevScriptEnv>
export type TelemetryViewerScriptEnv = ReturnType<typeof createTelemetryViewerScriptEnv>
