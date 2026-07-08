import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), 'utf8')
const regexEscape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const assertIncludes = (content: string, expected: string) => {
  assert.match(content, new RegExp(regexEscape(expected)))
}

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
    expectedSettings: ['VITE_API_GATEWAY_BASE_URL = "https://megiddo-staging-api.fly.dev"'],
    publicService: true,
  },
  {
    appName: 'megiddo-staging-api',
    dockerfilePath: 'deploy/containers/api.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/api.fly.toml',
    expectedSettings: [
      'IDENTITY_SERVICE_URL = "http://megiddo-staging-identity.internal:3002"',
      'TODO_SERVICE_URL = "http://megiddo-staging-todo.internal:3001"',
      'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET',
    ],
    publicService: true,
  },
  {
    appName: 'megiddo-staging-identity',
    dockerfilePath: 'deploy/containers/identity.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/identity.fly.toml',
    expectedSettings: [
      'IDENTITY_AUTH_PROVIDER = "better-auth"',
      'IDENTITY_TOKEN_CODEC = "jwt-jws"',
      'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET',
      'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64',
      'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64',
      'IDENTITY_DATABASE_PATH = "/data/identity.sqlite"',
      'IDENTITY_BETTER_AUTH_DATABASE_PATH = "/data/better-auth.sqlite"',
      'source = "megiddo_staging_identity_data"',
      'destination = "/data"',
    ],
    publicService: false,
  },
  {
    appName: 'megiddo-staging-todo',
    dockerfilePath: 'deploy/containers/todo.Dockerfile',
    flyTomlPath: 'deploy/fly/staging/todo.fly.toml',
    expectedSettings: [
      'IDENTITY_TOKEN_CODEC = "jwt-jws"',
      'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64',
      'TODO_DATABASE_PATH = "/data/todo.sqlite"',
      'source = "megiddo_staging_todo_data"',
      'destination = "/data"',
    ],
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
  for (const { appName, dockerfilePath, expectedSettings, flyTomlPath, publicService } of flyStagingApps) {
    assert.equal(existsSync(join(root, flyTomlPath)), true, `${flyTomlPath} should exist`)

    const manifest = read(flyTomlPath)

    assertIncludes(manifest, `app = "${appName}"`)
    assertIncludes(manifest, `dockerfile = "${dockerfilePath}"`)
    assertIncludes(manifest, 'path = "/health"')
    assert.doesNotMatch(manifest, /compose-rehearsal-missing-secret/)
    assert.doesNotMatch(manifest, /(?:SECRET|KEY[^\n]*) = "/)

    for (const expectedSetting of expectedSettings) {
      assertIncludes(manifest, expectedSetting)
    }

    if (publicService) {
      assert.match(manifest, /\[http_service\]/)
      assert.match(manifest, /force_https = true/)
    } else {
      assert.doesNotMatch(manifest, /\[http_service\]/)
      assert.doesNotMatch(manifest, /\[\[services\.ports\]\]/)
    }
  }
})
