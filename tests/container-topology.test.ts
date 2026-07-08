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

const flyStagingPublicUrls = [
  'https://megiddo-staging-frontend.fly.dev',
  'https://megiddo-staging-api.fly.dev',
] as const

const flyStagingPrivateServiceUrls = [
  'http://megiddo-staging-identity.internal:3002',
  'http://megiddo-staging-todo.internal:3001',
] as const

const stagingDeploymentRunbookPath = 'docs/runbooks/staging-deployment.md'
const firstLiveFlyDeployHandoffPath = 'docs/runbooks/first-live-fly-deploy-handoff.md'

const stagingDeploymentRunbookRequiredContent = [
  'AFK-agent repo work',
  'Operator steps',
  'pnpm containers:rehearse',
  'pnpm secrets:deployment',
  'fly auth login',
  'fly apps create megiddo-staging-frontend',
  'fly apps create megiddo-staging-api',
  'fly apps create megiddo-staging-identity',
  'fly apps create megiddo-staging-todo',
  'fly volumes create megiddo_staging_identity_data --app megiddo-staging-identity',
  'fly volumes create megiddo_staging_todo_data --app megiddo-staging-todo',
  'fly secrets set --app megiddo-staging-api',
  'fly secrets set --app megiddo-staging-identity',
  'fly secrets set --app megiddo-staging-todo',
  'fly deploy --config deploy/fly/staging/frontend.fly.toml',
  'fly deploy --config deploy/fly/staging/api.fly.toml',
  'fly deploy --config deploy/fly/staging/identity.fly.toml',
  'fly deploy --config deploy/fly/staging/todo.fly.toml',
  'https://megiddo-staging-frontend.fly.dev/health',
  'https://megiddo-staging-api.fly.dev/health',
  'http://megiddo-staging-identity.internal:3002/health',
  'http://megiddo-staging-todo.internal:3001/health',
  'temporary Fly provider choice',
  'single-instance stateful Services',
  'no backups',
  'no migrations',
  'basic observability only',
  'no CI/CD',
] as const

const firstLiveFlyDeployHandoffRequiredContent = [
  'First Live Fly Deploy Operator Handoff',
  'PRD #56',
  'Issue #64',
  ...flyStagingApps.map(({ appName }) => appName),
  ...flyStagingPublicUrls,
  ...flyStagingPrivateServiceUrls,
  'fly auth login',
  'fly orgs list',
  'pnpm containers:rehearse',
  'pnpm secrets:deployment',
  'fly apps create',
  'fly volumes create',
  'fly secrets set',
  'fly deploy',
  'fly ssh console --app megiddo-staging-api',
  'Frontend evidence',
  'API Gateway evidence',
  'Identity evidence',
  'Todo evidence',
  'API Gateway-to-Identity connectivity evidence',
  'API Gateway-to-Todo connectivity evidence',
  'Fly app IDs/names',
  'volume names',
  'deployed versions',
  'verification timestamps',
  'Stop and Revisit',
  'Better Auth browser flows require Identity to be public',
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

test('package scripts expose the mandatory local Compose deployment rehearsal', () => {
  const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
  const rehearsalScript = read('scripts/rehearse-compose-deployment.mts')

  assert.equal(packageJson.scripts['containers:rehearse'], 'tsx scripts/rehearse-compose-deployment.mts')
  assert.match(rehearsalScript, /docker compose up --build --wait --detach/)
  assert.match(rehearsalScript, /http:\/\/localhost:5173\/health/)
  assert.match(rehearsalScript, /http:\/\/localhost:3000\/health/)
  assert.match(rehearsalScript, /http:\/\/identity:3002\/health/)
  assert.match(rehearsalScript, /http:\/\/todo:3001\/health/)
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

test('staging deployment runbook is checked in and linked from the README', () => {
  const readme = read('README.md')

  assert.equal(
    existsSync(join(root, stagingDeploymentRunbookPath)),
    true,
    `${stagingDeploymentRunbookPath} should exist`,
  )
  assertIncludes(readme, `[Staging Deployment Runbook](${stagingDeploymentRunbookPath})`)

  const runbook = read(stagingDeploymentRunbookPath)

  for (const expected of stagingDeploymentRunbookRequiredContent) {
    assertIncludes(runbook, expected)
  }
})

test('first live Fly deploy handoff checklist captures operator evidence and stop conditions', () => {
  const runbook = read(stagingDeploymentRunbookPath)

  assert.equal(
    existsSync(join(root, firstLiveFlyDeployHandoffPath)),
    true,
    `${firstLiveFlyDeployHandoffPath} should exist`,
  )
  assertIncludes(runbook, '[First Live Fly Deploy Operator Handoff](first-live-fly-deploy-handoff.md)')

  const handoff = read(firstLiveFlyDeployHandoffPath)

  for (const expected of firstLiveFlyDeployHandoffRequiredContent) {
    assertIncludes(handoff, expected)
  }
})
