import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { dirname, join, normalize } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const docPath = fileURLToPath(
  new URL('../docs/reference/development-history-and-architecture-rationale.md', import.meta.url),
)
const docDir = dirname(docPath)

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
  const localLinkTargets = [...doc.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)]+)\)/g)].map(match => match[1])

  assert.ok(localLinkTargets.length > 0)

  for (const target of localLinkTargets) {
    const [targetPath] = target.split('#')
    assert.ok(targetPath, `link should include a path: ${target}`)

    const resolvedTargetPath = normalize(join(docDir, decodeURIComponent(targetPath)))
    await assert.doesNotReject(access(resolvedTargetPath), `local link should exist: ${target}`)
  }
})

test('development history guide documents service topology and boundary rationale', async () => {
  const doc = await readFile(docPath, 'utf8')

  assert.match(doc, /Issue: #53\. Parent PRD: #49\./)
  assert.match(
    doc,
    /thin end-to-end path through the frontend, API Gateway, Identity Service, Todo Service, contracts, and platform seams/i,
  )
  assert.match(doc, /frontend talks to the API Gateway rather than directly to the Identity Service or Todo Service/i)
  assert.match(doc, /Frontend API Adapter.*instead of raw oRPC clients or published contracts/is)
  assert.match(doc, /services verify Identity Tokens at their own boundary/i)
  assert.match(doc, /token cryptography.*behind.*seam/is)
  assert.match(doc, /real service processes in local development/i)
  assert.match(doc, /fakes in focused tests/i)
  assert.match(doc, /inferred rationale/i)
})
