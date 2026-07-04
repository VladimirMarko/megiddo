import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const root = process.cwd()

const readJson = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8')) as Record<string, unknown>

test('repo exposes the first Sandcastle service topology', () => {
  assert.equal(existsSync(join(root, 'apps/web')), false)
  assert.equal(existsSync(join(root, 'packages/shared')), false)

  for (const path of [
    'apps/frontend/package.json',
    'apps/api/package.json',
    'packages/contracts/package.json',
    'packages/platform/package.json',
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} should exist`)
  }

  const frontend = readJson('apps/frontend/package.json')
  const api = readJson('apps/api/package.json')
  const contracts = readJson('packages/contracts/package.json')
  const platform = readJson('packages/platform/package.json')

  assert.equal(frontend.name, '@megiddo/frontend')
  assert.equal(api.name, '@megiddo/api')
  assert.equal(contracts.name, '@megiddo/contracts')
  assert.equal(platform.name, '@megiddo/platform')

  assert.deepEqual(Object.keys(frontend.scripts as Record<string, string>).sort(), ['build', 'dev'])
  assert.deepEqual(Object.keys(api.scripts as Record<string, string>).sort(), ['build', 'dev'])
})
