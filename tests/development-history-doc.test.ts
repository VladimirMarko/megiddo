import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const docPath = fileURLToPath(
  new URL('../docs/reference/development-history-and-architecture-rationale.md', import.meta.url),
)

const requiredHeadings = [
  '# Development History And Architecture Rationale',
  '## Purpose',
  '## Canonical Source Rules',
  '## Development History',
  '## Architecture Themes',
  '## Decision Index',
  '## Supporting Sources',
  '## Known Transitional Decisions',
  '## Maintenance Guidance',
]

test('development history narrative skeleton exposes the required reader frame', async () => {
  const doc = await readFile(docPath, 'utf8')

  for (const heading of requiredHeadings) {
    assert.ok(doc.includes(heading), `${heading} should be present`)
  }

  assert.match(doc, /narrative index and explanatory guide/i)
  assert.match(doc, /ADRs remain the source of record/i)
  assert.match(doc, /supported source ordering/i)
  assert.match(doc, /not a commit-by-commit reconstruction/i)
  assert.match(doc, /README/i)
  assert.match(doc, /Env Catalog/i)
})

test('development history narrative skeleton only links to local files that exist', async () => {
  const doc = await readFile(docPath, 'utf8')
  const localMarkdownLinks = [...doc.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)]+)\)/g)].map(match => match[1])

  assert.ok(localMarkdownLinks.length > 0)

  for (const link of localMarkdownLinks) {
    const [path] = link.split('#')
    assert.ok(path, `link should include a path: ${link}`)

    const targetPath = normalize(join(dirname(docPath), decodeURIComponent(path)))
    await access(targetPath)
  }
})
