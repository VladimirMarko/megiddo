// OpenCode session:
// Owner column first in env catalog
// ses_0c26d6788ffeSgdo8l8VcDtNlg

import { createEnv, type StandardSchemaV1 } from '@t3-oss/env-core'
import { evolve, mapValues, prop } from 'remeda'
import { z } from 'zod'

type SchemaEntry = {
  description: string
  schema: StandardSchemaV1
}

type EnvContract =
  | {
      clientPrefix: string
      client: Record<string, SchemaEntry>
    }
  | {
      server: Record<string, SchemaEntry>
    }

type Pluck<T, Promote extends PropertyKey> = {
  [K in keyof T]: Promote extends keyof T[K] ? T[K][Promote] : never
}

type CollapseToSchemaUnderClientOrServer<T, Modify extends PropertyKey, Promote extends PropertyKey> = {
  [K in keyof T]: K extends Modify ? Pluck<T[K], Promote> : T[K]
}

const envContract: EnvContract = {
  server: {
    DATABASE_URL: {
      description: 'The URL of the database to connect to.',
      schema: z.url(),
    },
    OPEN_AI_API_KEY: {
      description: 'The API key for OpenAI.',
      schema: z.string().min(1),
    },
  },
}

const serverContractToOptionsFragment: (
  contract: EnvContract,
) => CollapseToSchemaUnderClientOrServer<EnvContract, 'client' | 'server', 'schema'> = evolve({
  server: mapValues(prop('schema')),
  client: mapValues(prop('schema')),
})

// const derivedEnvOptionsFragment = {
//   server: {
//     DATABASE_URL: z.url(),
//     OPEN_AI_API_KEY: z.string().min(1),
//   },
// }

const definedEnvOptionsFragment = {
  runtimeEnv: process.env,
}

function buildEnv<const TContract extends EnvContract>(envContract: TContract) {
  const derivedEnvOptionsFragment = serverContractToOptionsFragment(envContract)

  const envOptions = {
    ...derivedEnvOptionsFragment,
    ...definedEnvOptionsFragment,
  }

  return createEnv(envOptions)
}
