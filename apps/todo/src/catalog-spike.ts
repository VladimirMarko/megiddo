// OpenCode session:
// Owner column first in env catalog
// ses_0c26d6788ffeSgdo8l8VcDtNlg

import { createEnv } from '@t3-oss/env-core'
import { mapValues, prop } from 'remeda'
import { z } from 'zod'

type SchemaEntry<TSchema> = {
  description: string
  schema: TSchema
}

type EnvContract<TSchema = unknown> = {
  client?: Record<string, SchemaEntry<TSchema>>
  server?: Record<string, SchemaEntry<TSchema>>
}

type StripSchemaMetadata<TContract extends EnvContract> = {
  [TSection in keyof TContract]: TContract[TSection] extends Record<string, SchemaEntry<unknown>>
    ? { [TKey in keyof TContract[TSection]]: TContract[TSection][TKey]['schema'] }
    : never
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
} satisfies EnvContract<z.ZodType>

const contractToOptionsFragment = <TContract extends EnvContract>(contract: TContract): StripSchemaMetadata<TContract> => {
  return {
    ...(contract.server ? { server: mapValues(contract.server, prop('schema')) } : {}),
    ...(contract.client ? { client: mapValues(contract.client, prop('schema')) } : {}),
  } as StripSchemaMetadata<TContract>
}

const derivedEnvOptionsFragment = contractToOptionsFragment(envContract)

// const derivedEnvOptionsFragment = {
//   server: {
//     DATABASE_URL: z.url(),
//     OPEN_AI_API_KEY: z.string().min(1),
//   },
// }

const definedEnvOptionsFragment = {
  runtimeEnv: process.env,
}

const envOptions = {
  ...derivedEnvOptionsFragment,
  ...definedEnvOptionsFragment,
}

export const env = createEnv(envOptions)
