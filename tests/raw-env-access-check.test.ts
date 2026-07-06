import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkRawEnvAccess } from '../scripts/check-raw-env-access.mts'

test('raw env access check rejects unauthorized runtime env reads', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'megiddo-raw-env-check-'))

  try {
    await mkdir(join(rootDir, 'apps/api/src'), { recursive: true })
    await writeFile(join(rootDir, 'apps/api/src/app.ts'), `export const port = ${'process'}.env.PORT\n`, 'utf8')

    const result = await checkRawEnvAccess({ rootDir })

    assert.deepEqual(result.violations, [{ line: 1, path: 'apps/api/src/app.ts' }])
    assert.match(result.message, /raw runtime env access/)
  } finally {
    await rm(rootDir, { force: true, recursive: true })
  }
})

test('raw env access check allows reviewed env seams in this repo', async () => {
  const result = await checkRawEnvAccess({ rootDir: process.cwd() })

  assert.deepEqual(result.violations, [])
})
