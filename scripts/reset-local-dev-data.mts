import { rmSync } from 'node:fs'
import { createLocalDevResetScriptConfig, createLocalDevScriptEnv } from './script-config-builder.mjs'

const workspaceRoot = new URL('..', import.meta.url).pathname
const config = createLocalDevResetScriptConfig(createLocalDevScriptEnv(process.env), { workspaceRoot })

if (!config.dataDirectoryWasConfigured && !config.dataDirectory.startsWith(`${config.workspaceDataRoot}/`)) {
  throw new Error(
    `Refusing to remove ${config.dataDirectory}. Default local development data must live under ${config.workspaceDataRoot}.`,
  )
}

rmSync(config.dataDirectory, { force: true, recursive: true })

console.log(`Removed local development data: ${config.dataDirectory}`)
