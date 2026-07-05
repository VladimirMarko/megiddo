import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp, createTodoServiceClient } from '@megiddo/api'
import type { TodoResourceV1 } from '@megiddo/contracts'
import { createDevelopmentIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'
import { propagation, trace } from '@opentelemetry/api'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const postAuthenticatedRpc = (
  app: ReturnType<typeof createApiGatewayApp>,
  path: string,
  identityToken: string,
  json?: unknown,
) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { authorization: `Bearer ${identityToken}`, 'content-type': 'application/json' },
    method: 'POST',
  })

test('API Gateway to Todo oRPC call exports related OpenTelemetry client and server spans', async () => {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
  trace.setGlobalTracerProvider(provider)
  propagation.setGlobalPropagator(new W3CTraceContextPropagator())

  const codec = createDevelopmentIdentityTokenCodec()
  const todoApp = createTodoApp({ tokenVerifier: codec })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const apiApp = createApiGatewayApp({
    identityClient: {
      async issueDevelopmentIdentityToken(input) {
        return {
          identityToken: await codec.issueIdentityToken(input),
          user: { id: input.subject },
        }
      },
    },
    todoClient,
    tokenVerifier: codec,
  })
  const identityToken = await codec.issueIdentityToken({
    audience: { service: 'api-gateway' },
    contractVersion: 'v1',
    subject: 'dev:viewer',
  })

  const response = await postAuthenticatedRpc(apiApp, '/rpc/v1/viewer/todos/create', identityToken, {
    title: 'Trace me without payloads',
  })

  assert.equal(response.status, 200)
  const created = (await response.json()) as { json: TodoResourceV1 }
  assert.equal(created.json.title, 'Trace me without payloads')
  await provider.forceFlush()

  const spans = exporter.getFinishedSpans()
  const clientSpan = spans.find(span => span.attributes['orpc.role'] === 'client')
  const serverSpan = spans.find(span => span.attributes['orpc.role'] === 'server')

  assert.ok(clientSpan, 'expected an oRPC client span')
  assert.ok(serverSpan, 'expected an oRPC server span')
  assert.equal(clientSpan.attributes['service.name'], 'api-gateway')
  assert.equal(serverSpan.attributes['service.name'], 'todo')
  assert.equal(clientSpan.attributes['orpc.procedure'], 'v1.todos.create')
  assert.equal(serverSpan.attributes['orpc.procedure'], 'v1.todos.create')
  assert.equal(clientSpan.attributes['orpc.status'], 'ok')
  assert.equal(serverSpan.attributes['orpc.status'], 'ok')
  assert.equal(typeof clientSpan.attributes['orpc.duration_ms'], 'number')
  assert.equal(typeof serverSpan.attributes['orpc.duration_ms'], 'number')
  assert.equal(serverSpan.spanContext().traceId, clientSpan.spanContext().traceId)
  assert.equal(serverSpan.parentSpanContext?.spanId, clientSpan.spanContext().spanId)

  for (const span of [clientSpan, serverSpan]) {
    assert.equal(Object.values(span.attributes).includes('Trace me without payloads'), false)
    assert.equal(Object.values(span.attributes).includes(created.json.id), false)
  }

  await provider.shutdown()
})
