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

type CatalogSection = 'client' | 'server' | 'shared'

type BloomCatalogSections<TOptions> = Omit<TOptions, CatalogSection> & {
  [TSection in Extract<keyof TOptions, CatalogSection>]: TOptions[TSection] extends StandardSchemaDictionary
    ? BloomSchemaDictionary<TOptions[TSection]>
    : TOptions[TSection]
}

type StripCatalogSections<TOptions> = Omit<TOptions, CatalogSection> & {
  [TSection in Extract<keyof TOptions, CatalogSection>]: TOptions[TSection] extends Record<string, SchemaEntry<unknown>>
    ? { [TKey in keyof TOptions[TSection]]: TOptions[TSection][TKey]['schema'] }
    : TOptions[TSection]
}

type ServerClientCreateEnvOptions<
  TPrefix extends string | undefined,
  TServer extends StandardSchemaDictionary,
  TClient extends StandardSchemaDictionary,
> = {
  runtimeEnv: Record<string, boolean | number | string | undefined>
  clientPrefix: TPrefix
  client: TClient
  server: TServer
}

type CatalogCreateEnvOptions = BloomCatalogSections<
  ServerClientCreateEnvOptions<string, StandardSchemaDictionary, StandardSchemaDictionary>
>

const defineCatalogEnvOptions = <const TOptions extends CatalogCreateEnvOptions>(options: TOptions) => options

const stripCatalogMetadata = <const TOptions extends CatalogCreateEnvOptions>(options: TOptions): StripCatalogSections<TOptions> => {
  return {
    ...options,
    client: mapValues(options.client, prop('schema')),
    server: mapValues(options.server, prop('schema')),
  } as StripCatalogSections<TOptions>
}

const envOptions = defineCatalogEnvOptions({
  clientPrefix: 'PUBLIC_',
  runtimeEnv: process.env,
  client: {
    PUBLIC_ENABLE_EXPERIMENT: {
      description: 'Enables the public experiment UI.',
      schema: z.enum(['true', 'false']).optional(),
    },
  },
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

const createEnvOptions = stripCatalogMetadata(envOptions)

export const env = createEnv(createEnvOptions)

const _schemaCompatibilityCheck: StandardSchemaV1 = createEnvOptions.server.DATABASE_URL
const _clientSchemaCompatibilityCheck: StandardSchemaV1 | undefined = createEnvOptions.client.PUBLIC_ENABLE_EXPERIMENT
