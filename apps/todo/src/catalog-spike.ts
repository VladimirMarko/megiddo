// OpenCode session:
// Owner column first in env catalog
// ses_0c26d6788ffeSgdo8l8VcDtNlg

import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

type ContractSchema = z.ZodType

type EnvContract = {
  client?: Record<string, { description: string; schema: ContractSchema }>
  server?: Record<string, { description: string; schema: ContractSchema }>
}

type StripSchemaMetadata<TContract extends EnvContract> = {
  [TSection in keyof TContract]: TContract[TSection] extends Record<string, { schema: ContractSchema }>
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
} satisfies EnvContract

const stripSectionMetadata = <TSection extends Record<string, { schema: ContractSchema }>>(section: TSection) => {
  return Object.fromEntries(Object.entries(section).map(([key, entry]) => [key, entry.schema])) as {
    [TKey in keyof TSection]: TSection[TKey]['schema']
  }
}

const contractToOptionsFragment = <TContract extends EnvContract>(contract: TContract): StripSchemaMetadata<TContract> => {
  const options: Partial<Record<keyof EnvContract, Record<string, ContractSchema>>> = {}

  if (contract.server) {
    options.server = stripSectionMetadata(contract.server)
  }

  if (contract.client) {
    options.client = stripSectionMetadata(contract.client)
  }

  return options as StripSchemaMetadata<TContract>
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
