import { readFile } from 'node:fs/promises'

const endpoint = process.argv[2] ?? 'http://localhost:4318/v1/traces'
const traceFixture = new URL('../docs/reports/evidence/known-megiddo-trace.otlp.json', import.meta.url)

const response = await fetch(endpoint, {
  body: await readFile(traceFixture, 'utf8'),
  headers: { 'content-type': 'application/json' },
  method: 'POST',
})

const body = await response.text()

console.log(
  JSON.stringify(
    {
      body,
      endpoint,
      ok: response.ok,
      status: response.status,
    },
    null,
    2,
  ),
)

if (!response.ok) {
  process.exitCode = 1
}
