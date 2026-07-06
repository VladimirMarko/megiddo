import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { createLocalDevProcessDefinitions } from '../scripts/local-dev-topology.mts'

const root = process.cwd()

const readJson = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8')) as Record<string, unknown>

const removedPackagePaths = ['apps/web/package.json', 'packages/shared/package.json']

const packageJsonPaths = [
  'apps/frontend/package.json',
  'apps/api/package.json',
  'apps/identity/package.json',
  'apps/todo/package.json',
  'packages/contracts/package.json',
  'packages/platform/package.json',
]

const frontendTodoComponentPaths = [
  'apps/frontend/src/components/auth-session-prompt.tsx',
  'apps/frontend/src/components/form-title.ts',
  'apps/frontend/src/components/todo-create-form.tsx',
  'apps/frontend/src/components/todo-item.tsx',
]

test('repo exposes the first Sandcastle service topology', () => {
  for (const path of removedPackagePaths) {
    assert.equal(existsSync(join(root, path)), false, `${path} should not exist`)
  }

  for (const path of packageJsonPaths) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`)
  }

  const frontend = readJson('apps/frontend/package.json')
  const api = readJson('apps/api/package.json')
  const identity = readJson('apps/identity/package.json')
  const todo = readJson('apps/todo/package.json')
  const contracts = readJson('packages/contracts/package.json')
  const platform = readJson('packages/platform/package.json')

  assert.equal(frontend.name, '@megiddo/frontend')
  assert.equal(api.name, '@megiddo/api')
  assert.equal(identity.name, '@megiddo/identity')
  assert.equal(todo.name, '@megiddo/todo')
  assert.equal(contracts.name, '@megiddo/contracts')
  assert.equal(platform.name, '@megiddo/platform')

  assert.deepEqual(Object.keys(frontend.scripts as Record<string, string>).sort(), ['build', 'dev'])
  assert.deepEqual(Object.keys(api.scripts as Record<string, string>).sort(), ['build', 'dev'])
  assert.deepEqual(Object.keys(identity.scripts as Record<string, string>).sort(), ['build', 'dev'])
  assert.deepEqual(Object.keys(todo.scripts as Record<string, string>).sort(), ['build', 'dev'])
})

test('root dev script runs the full local topology', () => {
  const packageJson = readJson('package.json')
  const scripts = packageJson.scripts as Record<string, string>

  assert.equal(scripts.dev, 'tsx scripts/run-local-dev.mts')
  assert.equal(scripts['dev:local'], scripts.dev)
  assert.equal(scripts['dev:turbo'], 'turbo dev')
  assert.equal(scripts['telemetry:viewer'], 'tsx scripts/run-telemetry-viewer.mts')
  assert.equal(scripts.dev.includes('telemetry'), false)
})

test('local dev topology keeps telemetry viewer separate from service startup', () => {
  const processDefinitions = createLocalDevProcessDefinitions({
    apiPort: '3100',
    dataDirectory: '/tmp/megiddo-local-data',
    frontendPort: '5174',
    identityPort: '3102',
    todoPort: '3101',
  })

  assert.deepEqual(
    processDefinitions.map(processDefinition => processDefinition.packageName),
    ['@megiddo/identity', '@megiddo/todo', '@megiddo/api', '@megiddo/frontend'],
  )

  for (const processDefinition of processDefinitions) {
    assert.equal(processDefinition.packageName.includes('otel'), false)
    assert.equal(processDefinition.packageName.includes('telemetry'), false)
  }
})

test('README documents the selected telemetry viewer workflow separately from pnpm dev', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8')

  assert.match(readme, /selected local viewer is `otel-gui`/)
  assert.match(readme, /pnpm telemetry:viewer/)
  assert.match(readme, /pnpm dev/)
  assert.match(readme, /Service startup never waits for viewer availability/)
  assert.match(readme, /Nix development shell provides the pinned `otel-gui` release artifact/)
  assert.match(readme, /OTEL_GUI_BIN=\/path\/to\/otel-gui pnpm telemetry:viewer/)
})

test('root dev injects best-effort local OpenTelemetry defaults for services', () => {
  const processDefinitions = createLocalDevProcessDefinitions({
    apiPort: '3100',
    dataDirectory: '/tmp/megiddo-local-data',
    frontendPort: '5174',
    identityPort: '3102',
    todoPort: '3101',
  })

  assert.deepEqual(
    processDefinitions.map(processDefinition => [
      processDefinition.packageName,
      processDefinition.env.OTEL_SERVICE_NAME,
    ]),
    [
      ['@megiddo/identity', 'identity'],
      ['@megiddo/todo', 'todo'],
      ['@megiddo/api', 'api-gateway'],
      ['@megiddo/frontend', undefined],
    ],
  )

  for (const processDefinition of processDefinitions.filter(
    processDefinition => processDefinition.packageName !== '@megiddo/frontend',
  )) {
    assert.equal(processDefinition.env.OTEL_TRACES_EXPORTER, 'otlp')
    assert.equal(processDefinition.env.OTEL_EXPORTER_OTLP_ENDPOINT, 'http://localhost:4318')
    assert.equal(processDefinition.env.OTEL_EXPORTER_OTLP_PROTOCOL, 'http/protobuf')
  }

  assert.equal(processDefinitions[0]?.env.MEGIDDO_AUTH_PROFILE, 'local-dummy')
})

test('service packages do not depend on another service implementation package', () => {
  const servicePackageJsonPaths = ['apps/api/package.json', 'apps/identity/package.json', 'apps/todo/package.json']
  const servicePackageNames = servicePackageJsonPaths.map(path => readJson(path).name)

  for (const path of servicePackageJsonPaths) {
    const packageJson = readJson(path)
    const dependencies = packageJson.dependencies as Record<string, string> | undefined
    const illegalDependencies = servicePackageNames.filter(name => name !== packageJson.name && dependencies?.[name])

    assert.deepEqual(illegalDependencies, [], `${path} should not depend on another service implementation package`)
  }
})

test('frontend todo components stay behind the Frontend API Adapter seam', () => {
  for (const path of frontendTodoComponentPaths) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`)

    const source = readFileSync(join(root, path), 'utf8')

    assert.equal(source.includes('@megiddo/contracts'), false, `${path} should not import contract Resource shapes`)
    assert.equal(source.includes('@orpc/client'), false, `${path} should not import raw oRPC clients`)
  }
})
