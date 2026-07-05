import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

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
