import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export interface EnvCatalogEntry {
  allowedValues: string
  defaultValue: string
  description: string
  owner: string
  surface: string
  variable: string
}

export const envCatalogArtifactPath = 'docs/reference/env-catalog.md'

const metadataPaths = [
  'apps/api/src/env-catalog.json',
  'apps/identity/src/env-catalog.json',
  'apps/todo/src/env-catalog.json',
  'apps/frontend/src/env-catalog.json',
  'packages/platform/src/env-catalog.json',
  'scripts/env-catalog.json',
]

const catalogEntryFields = [
  'allowedValues',
  'defaultValue',
  'description',
  'owner',
  'surface',
  'variable',
] as const satisfies readonly (keyof EnvCatalogEntry)[]

export const knownInventoryVariableNames = [
  'API_PORT',
  'BETTER_AUTH_URL',
  'FRONTEND_PORT',
  'IDENTITY_AUTH_PROVIDER',
  'IDENTITY_BETTER_AUTH_BASE_URL',
  'IDENTITY_BETTER_AUTH_DATABASE_PATH',
  'IDENTITY_DATABASE_PATH',
  'IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS',
  'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET',
  'IDENTITY_PORT',
  'IDENTITY_SERVICE_URL',
  'IDENTITY_TOKEN_CODEC',
  'MEGIDDO_AUTH_PROFILE',
  'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64',
  'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64',
  'MEGIDDO_LOCAL_DATA_DIR',
  'NODE_ENV',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_PROTOCOL',
  'OTEL_GUI_BIN',
  'OTEL_GUI_PORT',
  'OTEL_SERVICE_NAME',
  'OTEL_TRACES_EXPORTER',
  'PORT',
  'TODO_DATABASE_PATH',
  'TODO_PORT',
  'TODO_SERVICE_URL',
  'UI_DUMMY_AUTH_LOGIN_SHORTCUT',
  'VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT',
] as const

const isCatalogEntry = (value: unknown): value is EnvCatalogEntry => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return catalogEntryFields.every(field => typeof candidate[field] === 'string')
}

const readMetadataFile = (root: string, path: string): EnvCatalogEntry[] => {
  const parsed = JSON.parse(readFileSync(join(root, path), 'utf8')) as unknown

  if (!Array.isArray(parsed) || !parsed.every(isCatalogEntry)) {
    throw new Error(`${path} must contain an array of Env Catalog entries`)
  }

  return parsed
}

export const buildEnvCatalog = (root = process.cwd()): EnvCatalogEntry[] =>
  metadataPaths
    .flatMap(path => readMetadataFile(root, path))
    .toSorted(
      (left, right) =>
        left.surface.localeCompare(right.surface) ||
        left.owner.localeCompare(right.owner) ||
        left.variable.localeCompare(right.variable),
    )

const escapeMarkdownTableCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', '<br>')

export const renderEnvCatalogMarkdown = (catalog: EnvCatalogEntry[]): string => {
  const lines = [
    '# Env Catalog',
    '',
    'Generated from env metadata adjacent to service, script, frontend, and platform env owners. This file is documentation/check tooling only; services must keep validating their own runtime env through owned Env Contracts.',
    '',
    '| Owner | Variable | Surface | Allowed values | Default | Description |',
    '| --- | --- | --- | --- | --- | --- |',
  ]

  for (const entry of catalog) {
    lines.push(
      `| ${escapeMarkdownTableCell(entry.owner)} | \`${escapeMarkdownTableCell(entry.variable)}\` | ${escapeMarkdownTableCell(entry.surface)} | ${escapeMarkdownTableCell(entry.allowedValues)} | ${escapeMarkdownTableCell(entry.defaultValue)} | ${escapeMarkdownTableCell(entry.description)} |`,
    )
  }

  lines.push('')
  return lines.join('\n')
}

const checkArtifact = (root: string) => {
  const expected = renderEnvCatalogMarkdown(buildEnvCatalog(root))
  const artifactPath = join(root, envCatalogArtifactPath)
  const actual = existsSync(artifactPath) ? readFileSync(artifactPath, 'utf8') : ''

  if (actual !== expected) {
    throw new Error('Env Catalog artifact is stale. Run: pnpm tsx scripts/env-catalog.mts --write')
  }
}

const writeArtifact = (root: string) => {
  writeFileSync(join(root, envCatalogArtifactPath), renderEnvCatalogMarkdown(buildEnvCatalog(root)))
}

const runCli = (root: string, mode: string) => {
  switch (mode) {
    case '--write':
      writeArtifact(root)
      break
    case '--check':
      checkArtifact(root)
      break
    default:
      throw new Error(`Unknown Env Catalog mode: ${mode}`)
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (isMain) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const mode = process.argv[2] ?? '--check'
  runCli(root, mode)
}
