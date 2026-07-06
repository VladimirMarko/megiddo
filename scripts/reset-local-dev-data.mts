import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const workspaceRoot = new URL('..', import.meta.url).pathname
const defaultDataDirectory = join(workspaceRoot, '.data', 'local-dev')
const configuredDataDirectory = process.env.MEGIDDO_LOCAL_DATA_DIR
const dataDirectory = resolve(configuredDataDirectory ?? defaultDataDirectory)
const workspaceDataRoot = resolve(workspaceRoot, '.data')

if (!configuredDataDirectory && !dataDirectory.startsWith(`${workspaceDataRoot}/`)) {
  throw new Error(
    `Refusing to remove ${dataDirectory}. Default local development data must live under ${workspaceDataRoot}.`,
  )
}

rmSync(dataDirectory, { force: true, recursive: true })

console.log(`Removed local development data: ${dataDirectory}`)
