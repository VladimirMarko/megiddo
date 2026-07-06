import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkFrontendContractBoundaries } from '../scripts/check-frontend-api-adapter-seam.mts'

test('frontend source keeps contract Resources behind the Frontend API Adapter seam', async () => {
  const result = await checkFrontendContractBoundaries({ rootDir: process.cwd() })

  assert.deepEqual(result.violations, [])
})

test('frontend contract boundary check rejects future UI component contract and oRPC imports', async () => {
  const rootDir = await mkdtemp(join(tmpdir(), 'megiddo-frontend-boundary-'))

  try {
    await mkdir(join(rootDir, 'apps/frontend/src/components'), { recursive: true })
    await mkdir(join(rootDir, 'apps/frontend/src/api'), { recursive: true })
    await writeFile(
      join(rootDir, 'apps/frontend/src/components/todo-card.tsx'),
      "import type { TodoResourceV1 } from '@megiddo/contracts'\n\nexport function TodoCard() {\n  return null\n}\n",
    )
    await writeFile(
      join(rootDir, 'apps/frontend/src/components/todo-client.tsx'),
      "import { createORPCClient } from '@orpc/client'\n\nexport const client = createORPCClient({})\n",
    )
    await writeFile(
      join(rootDir, 'apps/frontend/src/api/frontend-api-adapter.ts'),
      "import type { TodoResourceV1 } from '@megiddo/contracts'\nimport { createORPCClient } from '@orpc/client'\n\nexport type AdapterTodo = TodoResourceV1\nexport const client = createORPCClient({})\n",
    )

    const result = await checkFrontendContractBoundaries({ rootDir })

    assert.equal(result.violations.length, 2)
    assert.equal(result.violations[0]?.path, 'apps/frontend/src/components/todo-card.tsx')
    assert.equal(result.violations[1]?.path, 'apps/frontend/src/components/todo-client.tsx')
    assert.match(
      result.message,
      /Frontend API Adapter seam rule: frontend UI files must not import contract Resource types, raw contract details, or raw oRPC clients directly/,
    )
  } finally {
    await rm(rootDir, { force: true, recursive: true })
  }
})
