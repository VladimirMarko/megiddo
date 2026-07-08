import { enabledEnvFlagSchema } from '@megiddo/platform/env-schema-fragments'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export type FrontendRuntimeEnv = Record<string, string | boolean | number | undefined>

export const createFrontendEnv = (runtimeEnv: FrontendRuntimeEnv) =>
  createEnv({
    client: {
      VITE_API_GATEWAY_BASE_URL: z.string().url().optional(),
      VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT: enabledEnvFlagSchema.optional(),
    },
    clientPrefix: 'VITE_',
    emptyStringAsUndefined: true,
    runtimeEnv,
  })

export type FrontendEnv = ReturnType<typeof createFrontendEnv>
