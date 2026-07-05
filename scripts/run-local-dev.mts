import { type ChildProcess, spawn } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const workspaceRoot = new URL('..', import.meta.url).pathname
const dataDirectory = process.env.MEGIDDO_LOCAL_DATA_DIR ?? join(workspaceRoot, '.data', 'local-dev')
const apiPort = process.env.API_PORT ?? '3000'
const todoPort = process.env.TODO_PORT ?? '3001'
const identityPort = process.env.IDENTITY_PORT ?? '3002'
const frontendPort = process.env.FRONTEND_PORT ?? '5173'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const tokenEnv = {
  MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64: Buffer.from(
    privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  ).toString('base64url'),
  MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: Buffer.from(
    publicKey.export({ format: 'pem', type: 'spki' }).toString(),
  ).toString('base64url'),
}
const children: ChildProcess[] = []

mkdirSync(dataDirectory, { recursive: true })

const start = (packageName: string, env: NodeJS.ProcessEnv, args: string[] = []) => {
  const child = spawn('pnpm', ['--filter', packageName, 'dev', ...args], {
    cwd: workspaceRoot,
    env: { ...process.env, ...tokenEnv, ...env },
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
console.log(`- Identity: http://localhost:${identityPort}`)
console.log(`- Todo:     http://localhost:${todoPort}`)
console.log(`- API:      http://localhost:${apiPort}`)
console.log(`- Frontend: http://localhost:${frontendPort}`)
console.log(`- Data:     ${dataDirectory}`)

start('@megiddo/identity', {
  IDENTITY_DATABASE_PATH: join(dataDirectory, 'identity.sqlite'),
  PORT: identityPort,
})
start('@megiddo/todo', {
  PORT: todoPort,
  TODO_DATABASE_PATH: join(dataDirectory, 'todo.sqlite'),
})
start('@megiddo/api', {
  IDENTITY_SERVICE_URL: `http://localhost:${identityPort}`,
  PORT: apiPort,
  TODO_SERVICE_URL: `http://localhost:${todoPort}`,
})
start(
  '@megiddo/frontend',
  {
    PORT: frontendPort,
  },
  ['--', '--port', frontendPort],
)
