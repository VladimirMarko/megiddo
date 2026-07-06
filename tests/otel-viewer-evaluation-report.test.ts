import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const reportPath = new URL('../docs/reports/2026-07-05-local-opentelemetry-viewers.md', import.meta.url)
const tracePath = new URL('../docs/reports/evidence/known-megiddo-trace.otlp.json', import.meta.url)

const candidateHeadings = ['otel-gui', 'Aspire Dashboard standalone', 'otel-desktop-viewer', 'otel-tui']
const requiredReportPhrases = [
  'Install or startup command',
  'Receive OTLP HTTP traces on localhost:4318',
  'Ingestion evidence',
  'Failure',
]

type OtlpTraceFixture = {
  resourceSpans: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue?: string } }> }
    scopeSpans: Array<{ spans: Array<{ name: string; traceId: string; spanId: string }> }>
  }>
}

test('local OpenTelemetry viewer evaluation report records objective evidence', async () => {
  const report = await readFile(reportPath, 'utf8')

  for (const candidate of candidateHeadings) {
    assert.ok(report.includes(`## ${candidate}`))
  }

  assert.match(report, /OTLP HTTP.*localhost:4318/i)
  assert.match(report, /Known Megiddo trace/i)
  assert.match(report, /Machine-checkable proof/i)
  assert.match(report, /Recommendation/i)
  assert.match(report, /Human UI review/i)

  for (const requiredPhrase of requiredReportPhrases) {
    assert.match(report, new RegExp(requiredPhrase, 'i'))
  }
})

test('known viewer spike trace is a Megiddo OTLP trace fixture', async () => {
  const payload = JSON.parse(await readFile(tracePath, 'utf8')) as OtlpTraceFixture
  const spans = payload.resourceSpans.flatMap(resourceSpan =>
    resourceSpan.scopeSpans.flatMap(scopeSpan => scopeSpan.spans),
  )

  const serviceNames = payload.resourceSpans.map(
    resourceSpan =>
      resourceSpan.resource.attributes.find(attribute => attribute.key === 'service.name')?.value.stringValue,
  )
  const spanNames = spans.map(span => span.name)
  const traceIds = spans.map(span => span.traceId)

  assert.deepEqual(new Set(serviceNames), new Set(['api-gateway', 'todo']))
  assert.ok(spanNames.includes('orpc.client v1.todos.create'))
  assert.ok(spanNames.includes('orpc.server v1.todos.create'))
  assert.equal(new Set(traceIds).size, 1)
})
