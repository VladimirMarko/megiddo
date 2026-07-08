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

const requiredTopologyClaims = [
  {
    name: 'issue and parent PRD context',
    pattern: /Issue: #53\. Parent PRD: #49\./,
  },
  {
    name: 'thin end-to-end tracer-bullet path',
    pattern:
      /thin end-to-end path through the frontend, API Gateway, Identity Service, Todo Service, contracts, and platform seams/i,
  },
  {
    name: 'frontend-to-gateway boundary',
    pattern: /frontend talks to the API Gateway rather than directly to the Identity Service or Todo Service/i,
  },
  {
    name: 'Frontend API Adapter boundary',
    pattern: /Frontend API Adapter.*instead of raw oRPC clients or published contracts/is,
  },
  {
    name: 'service-boundary token verification',
    pattern: /services verify Identity Tokens at their own boundary/i,
  },
  {
    name: 'token cryptography seam',
    pattern: /token cryptography.*behind.*seam/is,
  },
  {
    name: 'real local service processes',
    pattern: /real service processes in local development/i,
  },
  {
    name: 'focused-test fakes',
    pattern: /fakes in focused tests/i,
  },
  {
    name: 'explicit inferred rationale labeling',
    pattern: /inferred rationale/i,
  },
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

  for (const claim of requiredTopologyClaims) {
    assert.match(doc, claim.pattern, `${claim.name} should be documented`)
  }
})
