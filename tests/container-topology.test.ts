import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')

const serviceDockerfiles = [
  { path: 'deploy/containers/frontend.Dockerfile', runtime: 'nginx:1.29-alpine', service: 'frontend' },
  { path: 'deploy/containers/api.Dockerfile', runtime: 'node:26-slim', service: 'api' },
  { path: 'deploy/containers/identity.Dockerfile', runtime: 'node:26-slim', service: 'identity' },
  { path: 'deploy/containers/todo.Dockerfile', runtime: 'node:26-slim', service: 'todo' },
] as const

test('split topology has one production container image definition per Service', () => {
  for (const { path, runtime, service } of serviceDockerfiles) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`)

    const dockerfile = read(path)
    assert.match(dockerfile, new RegExp(`FROM ${runtime.replace('.', '\\.')}`))
    assert.match(dockerfile, /pnpm install --frozen-lockfile/)
    assert.match(dockerfile, new RegExp(`pnpm --filter @megiddo/${service} build`))
    assert.doesNotMatch(dockerfile, /pnpm\s+dev|tsx\s+src\/server\.ts|vite\s+--host/)
  }
})

test('Node Service containers run built entrypoints on a node:sqlite-compatible runtime', () => {
  const expectedCommands = new Map([
    ['deploy/containers/api.Dockerfile', 'node apps/api/dist/server.js'],
    ['deploy/containers/identity.Dockerfile', 'node apps/identity/dist/server.js'],
    ['deploy/containers/todo.Dockerfile', 'node apps/todo/dist/server.js'],
  ])

  for (const [path, command] of expectedCommands) {
    const dockerfile = read(path)
    assert.match(dockerfile, /FROM node:26-slim AS runtime/)
    assert.match(dockerfile, new RegExp(`CMD \\["${command.split(' ').join('", "')}"\\]`))
  }
})

test('Compose rehearsal wires production-shaped split Services and persistent SQLite paths', () => {
  const compose = read('compose.yaml')

  for (const service of ['frontend', 'api', 'identity', 'todo']) {
    assert.match(compose, new RegExp(`^  ${service}:`, 'm'))
    assert.match(compose, new RegExp(`dockerfile: deploy/containers/${service}\\.Dockerfile`))
  }

  assert.match(compose, /VITE_API_GATEWAY_BASE_URL: http:\/\/localhost:3000/)
  assert.match(compose, /IDENTITY_SERVICE_URL: http:\/\/identity:3002/)
  assert.match(compose, /TODO_SERVICE_URL: http:\/\/todo:3001/)
  assert.match(compose, /NODE_ENV: production/)
  assert.match(compose, /IDENTITY_AUTH_PROVIDER: better-auth/)
  assert.match(compose, /IDENTITY_TOKEN_CODEC: jwt-jws/)
  assert.match(compose, /IDENTITY_DATABASE_PATH: \/data\/identity\.sqlite/)
  assert.match(compose, /IDENTITY_BETTER_AUTH_DATABASE_PATH: \/data\/better-auth\.sqlite/)
  assert.match(compose, /TODO_DATABASE_PATH: \/data\/todo\.sqlite/)
  assert.match(compose, /MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64:/)
  assert.match(compose, /MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64:/)
  assert.match(compose, /identity-data:\/data/)
  assert.match(compose, /todo-data:\/data/)
})

test('package scripts expose a local container image smoke build', () => {
  const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }

  assert.equal(packageJson.scripts['containers:build'], 'docker compose build')
})
