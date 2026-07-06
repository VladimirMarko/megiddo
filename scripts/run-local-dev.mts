import { type ChildProcess, spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { createLocalDevProcessDefinitions } from './local-dev-topology.mjs'
import { createLocalDevScriptConfig, createLocalDevScriptEnv } from './script-config-builder.mjs'

const workspaceRoot = new URL('..', import.meta.url).pathname
const config = createLocalDevScriptConfig(createLocalDevScriptEnv(process.env), { workspaceRoot })

const children: ChildProcess[] = []

mkdirSync(config.dataDirectory, { recursive: true })

const start = (packageName: string, env: NodeJS.ProcessEnv, args: string[] = []) => {
  const child = spawn('pnpm', ['--filter', packageName, 'dev', ...args], {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  })

  children.push(child)
}

const stop = () => {
  for (const child of children.toReversed()) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }
}

process.once('SIGINT', () => {
  stop()
  process.exit(130)
})
process.once('SIGTERM', () => {
  stop()
  process.exit(143)
})
process.once('exit', stop)

console.log('Starting local development services without Docker Compose:')
console.log(`- Identity: http://localhost:${config.identityPort}`)
console.log(`- Todo:     http://localhost:${config.todoPort}`)
console.log(`- API:      http://localhost:${config.apiPort}`)
console.log(`- Frontend: http://localhost:${config.frontendPort}`)
console.log(`- Data:     ${config.dataDirectory}`)

for (const processDefinition of createLocalDevProcessDefinitions(config)) {
  start(processDefinition.packageName, processDefinition.env, processDefinition.args)
}
