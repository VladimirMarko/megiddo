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

test('development history narrative documents issue 52 architecture rationale claims', async () => {
  const doc = await readFile(docPath, 'utf8')

  const requiredClaims = [
    /append-only published contract versions/i,
    /versioned contract surfaces/i,
    /multiple live contract versions/i,
    /runtime-addressable contract versions/i,
    /thin runtime-conformance tests/i,
    /Auth Provider Adapter/i,
    /Identity Token codec/i,
    /browser session/i,
    /dummy auth/i,
    /dummy tokens/i,
    /must not be accepted in production/i,
    /embedded local persistence behind adapters/i,
    /service-owned test and development persistence lifecycle/i,
    /best-effort local OpenTelemetry export/i,
    /evaluated existing local OpenTelemetry viewers before building custom tooling/i,
    /React, Vite, TanStack, and Jotai/i,
    /owned Env Contracts/i,
    /derived Config objects/i,
    /documentation and checking artifact rather than a runtime import surface/i,
    /historical context, not current architecture/i,
  ]

  for (const claim of requiredClaims) {
    assert.match(doc, claim)
  }
})
