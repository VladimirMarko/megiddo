import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const regexEscape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const serviceDockerfiles = [
  {
    dockerfilePath: 'deploy/containers/frontend.Dockerfile',
    packageName: '@megiddo/frontend',
    runtimeImage: 'nginx:1.29-alpine',
    serviceName: 'frontend',
  },
  {
    dockerfilePath: 'deploy/containers/api.Dockerfile',
    packageName: '@megiddo/api',
    runtimeImage: 'node:26-slim',
    serviceName: 'api',
  },
  {
    dockerfilePath: 'deploy/containers/identity.Dockerfile',
    packageName: '@megiddo/identity',
    runtimeImage: 'node:26-slim',
    serviceName: 'identity',
  },
  {
    dockerfilePath: 'deploy/containers/todo.Dockerfile',
    packageName: '@megiddo/todo',
    runtimeImage: 'node:26-slim',
    serviceName: 'todo',
  },
] as const

const nodeEntrypoints = [
  { command: ['node', 'apps/api/dist/server.js'], dockerfilePath: 'deploy/containers/api.Dockerfile' },
  { command: ['node', 'apps/identity/dist/server.js'], dockerfilePath: 'deploy/containers/identity.Dockerfile' },
  { command: ['node', 'apps/todo/dist/server.js'], dockerfilePath: 'deploy/containers/todo.Dockerfile' },
] as const

const flyStagingApps = [
  {
    appName: 'megiddo-staging-frontend',
    dockerfilePath: 'deploy/containers/frontend.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/frontend.fly.toml',
    publicService: true,
  },
  {
    appName: 'megiddo-staging-api',
    dockerfilePath: 'deploy/containers/api.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/api.fly.toml',
    publicService: true,
  },
  {
    appName: 'megiddo-staging-identity',
    dockerfilePath: 'deploy/containers/identity.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/identity.fly.toml',
    publicService: false,
  },
  {
    appName: 'megiddo-staging-todo',
    dockerfilePath: 'deploy/containers/todo.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/todo.fly.toml',
    publicService: false,
  },
] as const

test('split topology has one production container image definition per Service', () => {
  for (const { dockerfilePath, packageName, runtimeImage } of serviceDockerfiles) {
    assert.equal(existsSync(join(root, dockerfilePath)), true, `${dockerfilePath} should exist`)

    const dockerfile = read(dockerfilePath)
    assert.match(dockerfile, new RegExp(`FROM ${regexEscape(runtimeImage)}`))
    assert.match(dockerfile, /pnpm install --frozen-lockfile/)
    assert.match(dockerfile, new RegExp(`pnpm --filter ${regexEscape(packageName)} build`))
    assert.doesNotMatch(dockerfile, /pnpm\s+dev|tsx\s+src\/server\.ts|vite\s+--host/)
  }
})

test('Node Service containers run built entrypoints on a node:sqlite-compatible runtime', () => {
  for (const { command, dockerfilePath } of nodeEntrypoints) {
    const dockerfile = read(dockerfilePath)
    const dockerCommand = `["${command.join('", "')}"]`

    assert.match(dockerfile, /FROM node:26-slim AS runtime/)
    assert.match(dockerfile, new RegExp(`CMD ${regexEscape(dockerCommand)}`))
  }
})

test('Compose rehearsal wires production-shaped split Services and persistent SQLite paths', () => {
  const compose = read('compose.yaml')

  for (const { dockerfilePath, serviceName } of serviceDockerfiles) {
    assert.match(compose, new RegExp(`^  ${serviceName}:`, 'm'))
    assert.match(compose, new RegExp(`dockerfile: ${regexEscape(dockerfilePath)}`))
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

test('Fly staging manifests describe canonical app boundaries and runtime configuration', () => {
  for (const { appName, dockerfilePath, flyTomlPath, publicService } of flyStagingApps) {
    assert.equal(existsSync(join(root, flyTomlPath)), true, `${flyTomlPath} should exist`)

    const manifest = read(flyTomlPath)

    assert.match(manifest, new RegExp(`app = "${regexEscape(appName)}"`))
    assert.match(manifest, new RegExp(`dockerfile = "${regexEscape(dockerfilePath)}"`))
    assert.match(manifest, /path = "\/health"/)
    assert.doesNotMatch(manifest, /compose-rehearsal-missing-secret/)
    assert.doesNotMatch(manifest, /(?:SECRET|KEY[^\n]*) = "/)

    if (publicService) {
      assert.match(manifest, /\[http_service\]/)
      assert.match(manifest, /force_https = true/)
    } else {
      assert.doesNotMatch(manifest, /\[http_service\]/)
      assert.doesNotMatch(manifest, /\[\[services\.ports\]\]/)
    }
  }

  const frontend = read('deploy/fly/staging/frontend.fly.toml')
  assert.match(frontend, /VITE_API_GATEWAY_BASE_URL = "https:\/\/megiddo-staging-api\.fly\.dev"/)

  const api = read('deploy/fly/staging/api.fly.toml')
  assert.match(api, /IDENTITY_SERVICE_URL = "http:\/\/megiddo-staging-identity\.internal:3002"/)
  assert.match(api, /TODO_SERVICE_URL = "http:\/\/megiddo-staging-todo\.internal:3001"/)
  assert.match(api, /IDENTITY_INTERNAL_SERVICE_AUTH_SECRET/)

  const identity = read('deploy/fly/staging/identity.fly.toml')
  assert.match(identity, /IDENTITY_AUTH_PROVIDER = "better-auth"/)
  assert.match(identity, /IDENTITY_TOKEN_CODEC = "jwt-jws"/)
  assert.match(identity, /IDENTITY_INTERNAL_SERVICE_AUTH_SECRET/)
  assert.match(identity, /MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64/)
  assert.match(identity, /MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64/)
  assert.match(identity, /IDENTITY_DATABASE_PATH = "\/data\/identity\.sqlite"/)
  assert.match(identity, /IDENTITY_BETTER_AUTH_DATABASE_PATH = "\/data\/better-auth\.sqlite"/)
  assert.match(identity, /source = "megiddo_staging_identity_data"/)
  assert.match(identity, /destination = "\/data"/)

  const todo = read('deploy/fly/staging/todo.fly.toml')
  assert.match(todo, /IDENTITY_TOKEN_CODEC = "jwt-jws"/)
  assert.match(todo, /MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64/)
  assert.match(todo, /TODO_DATABASE_PATH = "\/data\/todo\.sqlite"/)
  assert.match(todo, /source = "megiddo_staging_todo_data"/)
  assert.match(todo, /destination = "\/data"/)
})
