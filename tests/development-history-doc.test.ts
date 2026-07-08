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
    pattern: /Issue: #54\. Parent PRD: #49\./,
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

const requiredArchitectureClaims = [
  { label: 'contract append-only policy', pattern: /append-only published contract versions/i },
  { label: 'contract surfaces', pattern: /versioned contract surfaces/i },
  { label: 'multiple live contract versions', pattern: /multiple live contract versions/i },
  { label: 'runtime-addressable contract versions', pattern: /runtime-addressable contract versions/i },
  { label: 'contract smoke tests', pattern: /thin runtime-conformance tests/i },
  { label: 'auth provider adapter', pattern: /Auth Provider Adapter/i },
  { label: 'identity token codec', pattern: /Identity Token codec/i },
  { label: 'browser session', pattern: /browser session/i },
  { label: 'dummy auth', pattern: /dummy auth/i },
  { label: 'dummy tokens', pattern: /dummy tokens/i },
  { label: 'production dummy-token rejection', pattern: /must not be accepted in production/i },
  { label: 'embedded persistence', pattern: /embedded local persistence behind adapters/i },
  {
    label: 'service-owned persistence lifecycle',
    pattern: /service-owned test and development persistence lifecycle/i,
  },
  { label: 'best-effort telemetry', pattern: /best-effort local OpenTelemetry export/i },
  {
    label: 'viewer evaluation before custom tooling',
    pattern: /evaluated existing local OpenTelemetry viewers before building custom tooling/i,
  },
  { label: 'frontend stack', pattern: /React, Vite, TanStack, and Jotai/i },
  { label: 'owned env contracts', pattern: /owned Env Contracts/i },
  { label: 'derived config objects', pattern: /derived Config objects/i },
  {
    label: 'env catalog role',
    pattern: /documentation and checking artifact rather than a runtime import surface/i,
  },
  { label: 'historical context boundary', pattern: /historical context, not current architecture/i },
]

const localMarkdownLinkTargets = (markdown: string) =>
  [...markdown.matchAll(/\[[^\]]+\]\((?!https?:|#)([^)]+)\)/g)].map(match => match[1])

const githubHeadingSlug = (heading: string) =>
  heading
    .trim()
    .replace(/^#+\s*/, '')
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const markdownHeadingAnchors = async (filePath: string) => {
  const markdown = await readFile(filePath, 'utf8')
  const anchors = new Set<string>()

  for (const line of markdown.split('\n')) {
    if (/^#{1,6}\s+/.test(line)) {
      anchors.add(githubHeadingSlug(line))
    }
  }

  return anchors
}

test('development history narrative skeleton exposes the required reader frame', async () => {
  const doc = await readFile(docPath, 'utf8')

  assert.doesNotMatch(doc, /<<<<<<<|=======|>>>>>>>/, 'document should not contain merge markers')

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
  const localLinkTargets = localMarkdownLinkTargets(doc)
  const anchorsByPath = new Map<string, Set<string>>()

  assert.ok(localLinkTargets.length > 0)

  for (const target of localLinkTargets) {
    const [targetPath, anchor] = target.split('#')
    assert.ok(targetPath, `link should include a path: ${target}`)

    const resolvedTargetPath = normalize(join(docDir, decodeURIComponent(targetPath)))
    await assert.doesNotReject(access(resolvedTargetPath), `local link should exist: ${target}`)

    if (anchor) {
      let anchors = anchorsByPath.get(resolvedTargetPath)
      if (!anchors) {
        anchors = await markdownHeadingAnchors(resolvedTargetPath)
        anchorsByPath.set(resolvedTargetPath, anchors)
      }

      assert.ok(anchors.has(anchor), `local link anchor should exist: ${target}`)
    }
  }
})

test('development history guide documents source-backed architecture claims', async () => {
  const doc = await readFile(docPath, 'utf8')

  for (const { label, pattern } of requiredArchitectureClaims) {
    assert.match(doc, pattern, `${label} claim should be documented`)
  }

  for (const claim of requiredTopologyClaims) {
    assert.match(doc, claim.pattern, `${claim.name} should be documented`)
  }
})

test('development history guide validates issue 54 reader-facing accuracy constraints', async () => {
  const doc = await readFile(docPath, 'utf8')

  assert.match(doc, /ADR-0017 is brief, so this guide should not invent/i)
  assert.match(doc, /should not claim a specific service currently serves multiple versions/i)
  assert.match(doc, /Identity Service current-state report.*historical/is)
  assert.match(doc, /environment variables report.*historical/is)
  assert.match(doc, /\[`README`\]\(\.\.\/\.\.\/README\.md#local-development\)/)
  assert.match(doc, /\[`README`\]\(\.\.\/\.\.\/README\.md#tests\)/)
  assert.match(doc, /\[`Local Telemetry Viewer`\]\(\.\.\/\.\.\/README\.md#local-telemetry-viewer\)/)
  assert.doesNotMatch(doc, /```(?:sh|bash|shell)[\s\S]*pnpm dev/, 'guide should not duplicate README commands')
})
