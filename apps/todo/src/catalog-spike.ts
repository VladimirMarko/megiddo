// OpenCode session:
// Owner column first in env catalog
// ses_0c26d6788ffeSgdo8l8VcDtNlg

import { createEnv, type StandardSchemaDictionary, type StandardSchemaV1 } from '@t3-oss/env-core'
import { mapValues, prop } from 'remeda'
import { z } from 'zod'

type EnvCatalogMetadata = {
  description: string
}

type SchemaEntry<TSchema> = EnvCatalogMetadata & {
  schema: TSchema
}

type BloomSchemaDictionary<TSchemaDictionary extends StandardSchemaDictionary> = {
  [TKey in keyof TSchemaDictionary]: SchemaEntry<TSchemaDictionary[TKey]>
}

type ServerCreateEnvOptions<TServer extends StandardSchemaDictionary> = {
  runtimeEnv: Record<string, boolean | number | string | undefined>
  server: TServer
}

type BloomServerCreateEnvOptions<TOptions extends ServerCreateEnvOptions<StandardSchemaDictionary>> = Omit<
  TOptions,
  'server'
> & {
  server: BloomSchemaDictionary<TOptions['server']>
}

type StripServerCatalogMetadata<TOptions extends BloomServerCreateEnvOptions<ServerCreateEnvOptions<StandardSchemaDictionary>>> =
  Omit<TOptions, 'server'> & {
    server: {
      [TKey in keyof TOptions['server']]: TOptions['server'][TKey]['schema']
    }
  }

const defineCatalogEnvOptions = <const TOptions extends BloomServerCreateEnvOptions<ServerCreateEnvOptions<StandardSchemaDictionary>>>(
  options: TOptions,
) => options

const stripCatalogMetadata = <const TOptions extends BloomServerCreateEnvOptions<ServerCreateEnvOptions<StandardSchemaDictionary>>>(
  options: TOptions,
): StripServerCatalogMetadata<TOptions> => {
  return {
    ...options,
    server: mapValues(options.server, prop('schema')),
  } as StripServerCatalogMetadata<TOptions>
}

const envOptions = defineCatalogEnvOptions({
  runtimeEnv: process.env,
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
})

const createServerEnv = <TServer extends StandardSchemaDictionary>(options: ServerCreateEnvOptions<TServer>) =>
  createEnv<undefined, TServer>(options)

const createEnvOptions = stripCatalogMetadata(envOptions)

export const env = createServerEnv(createEnvOptions)

const _schemaCompatibilityCheck: StandardSchemaV1 = createEnvOptions.server.DATABASE_URL
