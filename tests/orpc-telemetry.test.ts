import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApiGatewayApp, createIdentityServiceClient, createTodoServiceClient } from '@megiddo/api'
import type { TodoResourceV1 } from '@megiddo/contracts'
import { createIdentityApp } from '@megiddo/identity'
import { createDevelopmentIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'
import { propagation, SpanStatusCode, trace } from '@opentelemetry/api'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const postRpc = (app: ReturnType<typeof createApiGatewayApp>, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

const postRpcWithCookie = (app: ReturnType<typeof createApiGatewayApp>, path: string, cookie: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json', cookie },
    method: 'POST',
  })

const spanFor = (spans: ReadableSpan[], attributes: Record<string, string>) =>
  spans.find(span =>
    Object.entries(attributes).every(([attribute, expected]) => span.attributes[attribute] === expected),
  )

const assertSpan = (spans: ReadableSpan[], attributes: Record<string, string>, message: string) => {
  const span = spanFor(spans, attributes)
  assert.ok(span, message)

  return span
}

test('backend oRPC calls export consistent spans and failed client metadata', async () => {
  const exporter = new InMemorySpanExporter()
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
  trace.setGlobalTracerProvider(provider)
  propagation.setGlobalPropagator(new W3CTraceContextPropagator())

  const codec = createDevelopmentIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    fetch(request) {
      const url = new URL(request.url)
      return todoApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const apiApp = createApiGatewayApp({
    identityClient,
    todoClient,
  })
  const signInResponse = await postRpc(apiApp, '/rpc/v1/viewer/session/signIn', {
    method: 'dummy',
    principalId: 'dummy:alice',
  })
  assert.equal(signInResponse.status, 200)
  const setCookie = signInResponse.headers.get('set-cookie')
  assert.ok(setCookie)
  const cookie = setCookie.split(';')[0]

  const response = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/create', cookie, {
    title: 'Trace me without payloads',
  })

  assert.equal(response.status, 200)
  const created = (await response.json()) as { json: TodoResourceV1 }
  assert.equal(created.json.title, 'Trace me without payloads')

  const failedResponse = await postRpcWithCookie(apiApp, '/rpc/v1/viewer/todos/complete', cookie, {
    id: 'missing-todo',
  })

  assert.equal(failedResponse.ok, false)
  await provider.forceFlush()

  const spans = exporter.getFinishedSpans()
  const apiServerSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.viewer.todos.create',
      'orpc.role': 'server',
      'service.name': 'api-gateway',
    },
    'expected an API Gateway oRPC server span',
  )
  const identityClientSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.development.identityTokens.issue',
      'orpc.role': 'client',
      'service.name': 'api-gateway',
    },
    'expected an Identity oRPC client span',
  )
  const identityServerSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.development.identityTokens.issue',
      'orpc.role': 'server',
      'service.name': 'identity',
    },
    'expected an Identity oRPC server span',
  )
  const todoClientSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.todos.create',
      'orpc.role': 'client',
      'service.name': 'api-gateway',
    },
    'expected a Todo oRPC client span',
  )
  const todoServerSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.todos.create',
      'orpc.role': 'server',
      'service.name': 'todo',
    },
    'expected a Todo oRPC server span',
  )
  const failedTodoClientSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.todos.complete',
      'orpc.role': 'client',
      'service.name': 'api-gateway',
    },
    'expected a failed Todo oRPC client span',
  )

  for (const span of [apiServerSpan, identityClientSpan, identityServerSpan, todoClientSpan, todoServerSpan]) {
    assert.equal(span.attributes['orpc.status'], 'ok')
    assert.equal(typeof span.attributes['orpc.duration_ms'], 'number')
    assert.equal(span.attributes['http.request.url'], undefined)
  }

  assert.equal(identityServerSpan.spanContext().traceId, identityClientSpan.spanContext().traceId)
  assert.equal(identityServerSpan.parentSpanContext?.spanId, identityClientSpan.spanContext().spanId)
  assert.equal(todoServerSpan.spanContext().traceId, todoClientSpan.spanContext().traceId)
  assert.equal(todoServerSpan.parentSpanContext?.spanId, todoClientSpan.spanContext().spanId)

  assert.equal(failedTodoClientSpan.attributes['orpc.status'], 'error')
  assert.equal(failedTodoClientSpan.status.code, SpanStatusCode.ERROR)
  assert.equal(failedTodoClientSpan.attributes['error.type'], 'HTTP 500')
  assert.equal(failedTodoClientSpan.attributes['http.response.status_code'], 500)
  assert.equal(failedTodoClientSpan.attributes['http.request.url'], 'http://todo-service.test/rpc/v1/todos/complete')

  for (const span of spans) {
    assert.equal(Object.values(span.attributes).includes('Trace me without payloads'), false)
    assert.equal(Object.values(span.attributes).includes(created.json.id), false)
    assert.equal(Object.values(span.attributes).includes('missing-todo'), false)
  }

  await provider.shutdown()
})
