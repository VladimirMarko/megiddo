// OpenCode session:
// Owner column first in env catalog
// ses_0c26d6788ffeSgdo8l8VcDtNlg

import { createEnv, type StandardSchemaV1 } from '@t3-oss/env-core'
import { mapValues, prop } from 'remeda'
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

type ClientEnvContract = Extract<EnvContract, { client: Record<string, SchemaEntry> }>
type ServerEnvContract = Extract<EnvContract, { server: Record<string, SchemaEntry> }>

type Pluck<T, Promote extends PropertyKey> = {
  [K in keyof T]: Promote extends keyof T[K] ? T[K][Promote] : never
}

type NestedPluck<T, Modify extends PropertyKey, Promote extends PropertyKey> = {
  [K in keyof T]: K extends Modify ? Pluck<T[K], Promote> : T[K]
}

const envContract = {
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
} satisfies EnvContract

function contractToOptionsFragment<TContract extends ClientEnvContract>(
  contract: TContract,
): NestedPluck<TContract, 'client', 'schema'>
function contractToOptionsFragment<TContract extends ServerEnvContract>(
  contract: TContract,
): NestedPluck<TContract, 'server', 'schema'>
function contractToOptionsFragment(
  contract: EnvContract,
): NestedPluck<ClientEnvContract, 'client', 'schema'> | NestedPluck<ServerEnvContract, 'server', 'schema'> {
  if ('server' in contract) {
    return {
      server: mapValues(contract.server, prop('schema')),
    }
  }

  return {
    clientPrefix: contract.clientPrefix,
    client: mapValues(contract.client, prop('schema')),
  }
}

// const derivedEnvOptionsFragment = {
//   server: {
//     DATABASE_URL: z.url(),
//     OPEN_AI_API_KEY: z.string().min(1),
//   },
// }

const definedEnvOptionsFragment = {
  runtimeEnv: process.env,
}

function buildEnv<const TContract extends ClientEnvContract>(envContract: TContract): ReturnType<typeof createEnv>
function buildEnv<const TContract extends ServerEnvContract>(envContract: TContract): ReturnType<typeof createEnv>
function buildEnv(envContract: EnvContract) {
  if ('server' in envContract) {
    return createEnv({
      ...contractToOptionsFragment(envContract),
      ...definedEnvOptionsFragment,
    })
  }

  return createEnv({
    ...contractToOptionsFragment(envContract),
    ...definedEnvOptionsFragment,
  })
}

export const env = buildEnv(envContract)
