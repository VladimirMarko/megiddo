import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { createApiGatewayApp, createIdentityServiceClient, createTodoServiceClient } from '@megiddo/api'
import type { TodoResourceV1 } from '@megiddo/contracts'
import { createIdentityApp } from '@megiddo/identity'
import {
  createInstrumentedOrpcClientFetch,
  createJwtJwsIdentityTokenCodec,
  internalServiceHeader,
  internalServiceSecretHeader,
} from '@megiddo/platform'
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

const exporter = new InMemorySpanExporter()
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] })
trace.setGlobalTracerProvider(provider)
propagation.setGlobalPropagator(new W3CTraceContextPropagator())
beforeEach(() => exporter.reset())
after(async () => {
  await provider.shutdown()
  trace.disable()
  propagation.disable()
})

test('backend oRPC calls export consistent spans and failed client metadata', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoApp({ tokenVerifier: codec })
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test',
    async fetch(request) {
      const url = new URL(request.url)
      return identityApp.request(`${url.pathname}${url.search}`, request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test',
    async fetch(request) {
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
      'orpc.procedure': 'v1.internal.identityTokens.issueForBrowserSession',
      'orpc.role': 'client',
      'service.name': 'api-gateway',
    },
    'expected an Identity oRPC client span',
  )
  const identityServerSpan = assertSpan(
    spans,
    {
      'orpc.procedure': 'v1.internal.identityTokens.issueForBrowserSession',
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
})

test('reused service clients label each procedure independently of base paths and preserve Identity authentication', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoApp({ tokenVerifier: codec })
  const identityRequests: Request[] = []
  const todoRequests: Request[] = []
  const identityClient = createIdentityServiceClient({
    baseUrl: 'http://identity-service.test/services/identity/',
    async fetch(request) {
      identityRequests.push(request)
      return identityApp.request(new URL(request.url).pathname.replace('/services/identity', ''), request)
    },
  })
  const todoClient = createTodoServiceClient({
    baseUrl: 'http://todo-service.test/services/todo/',
    async fetch(request) {
      todoRequests.push(request)
      return todoApp.request(new URL(request.url).pathname.replace('/services/todo', ''), request)
    },
  })

  await identityClient.getOperationalHealth()
  await identityClient.getAuthCapabilities()
  await identityClient.createBrowserSession({ method: 'dummy', principalId: 'dummy:alice' })
  const { browserSession } = await identityClient.createBrowserSessionForSignUp({
    method: 'dummy',
    displayName: 'Trace user',
  })
  const sessionInput = { sessionId: browserSession.id }
  await identityClient.resolveBrowserSession(sessionInput)
  await identityClient.issueDevelopmentIdentityToken({ audience: { service: 'todo' } })
  const { identityToken } = await identityClient.issueBrowserSessionIdentityToken({
    ...sessionInput,
    audience: { service: 'todo' },
  })
  await identityClient.deleteBrowserSession(sessionInput)

  await Promise.all([todoClient.getOperationalHealth(), todoClient.listTodos({ identityToken })])
  const created = await todoClient.createTodo({ identityToken, title: 'Reuse a client' })
  const todoInput = { identityToken, id: created.id }
  assert.equal((await todoClient.completeTodo(todoInput)).completed, true)
  assert.equal((await todoClient.reopenTodo(todoInput)).completed, false)
  assert.equal((await todoClient.renameTodo({ ...todoInput, title: 'Renamed' })).title, 'Renamed')

  await provider.forceFlush()
  const spans = exporter.getFinishedSpans()
  const identityProcedures = [
    'v1.operational.health',
    'v1.auth.capabilities',
    'v1.auth.signIn',
    'v1.auth.signUp',
    'v1.auth.current',
    'v1.development.identityTokens.issue',
    'v1.internal.identityTokens.issueForBrowserSession',
    'v1.auth.signOut',
  ]
  const todoProcedures = [
    'v1.operational.health',
    'v1.todos.list',
    'v1.todos.create',
    'v1.todos.complete',
    'v1.todos.reopen',
    'v1.todos.rename',
  ]
  for (const [service, requests, procedures] of [
    ['identity', identityRequests, identityProcedures],
    ['todo', todoRequests, todoProcedures],
  ] as const) {
    assert.equal(requests.length, procedures.length)
    for (const [index, procedure] of procedures.entries()) {
      const request = requests[index]
      assert.ok(request)
      assert.equal(
        request.url,
        `http://${service}-service.test/services/${service}/rpc/${procedure.replaceAll('.', '/')}`,
      )
      const serverSpan = assertSpan(
        spans,
        {
          'orpc.procedure': procedure,
          'orpc.role': 'server',
          'service.name': service,
        },
        `expected ${service} server span for ${procedure}`,
      )
      const clientSpan = spans.find(span => span.spanContext().spanId === serverSpan.parentSpanContext?.spanId)
      assert.ok(clientSpan)
      assert.equal(clientSpan.name, `api-gateway oRPC client ${procedure}`)
      assert.equal(clientSpan.attributes['orpc.procedure'], procedure)
      assert.equal(clientSpan.attributes['orpc.role'], 'client')
      assert.equal(clientSpan.attributes['service.name'], 'api-gateway')
      assert.equal(clientSpan.status.code, SpanStatusCode.OK)
      assert.equal(serverSpan.spanContext().traceId, clientSpan.spanContext().traceId)
      assert.equal(
        request.headers.get('traceparent'),
        `00-${clientSpan.spanContext().traceId}-${clientSpan.spanContext().spanId}-01`,
      )
      const isInternal =
        service === 'identity' && (procedure.startsWith('v1.internal.') || procedure.startsWith('v1.development.'))
      assert.equal(request.headers.get(internalServiceHeader), isInternal ? 'api-gateway' : null)
      assert.equal(request.headers.has(internalServiceSecretHeader), isInternal)
    }
  }
})

test('shared client transport preserves thrown errors and records each failed procedure', async () => {
  const errors = [new TypeError('network unavailable'), 'transport rejected']
  const procedures = ['list', 'create']
  const transport = createInstrumentedOrpcClientFetch({
    serviceName: 'test-gateway',
    fetch: async () => {
      throw errors.shift()
    },
  })
  for (const procedure of procedures) {
    const error = errors[0]
    const request = new Request(`http://todo.test/nested/rpc/v1/todos/${procedure}`)
    await assert.rejects(transport(request, {}, {}, ['v1', 'todos', procedure]), thrown => thrown === error)
  }
  await provider.forceFlush()
  const spans = exporter.getFinishedSpans()
  assert.equal(spans.length, 2)
  for (const [index, procedure] of procedures.entries()) {
    const span = assertSpan(spans, { 'orpc.procedure': `v1.todos.${procedure}` }, `expected failed ${procedure} span`)
    assert.equal(span.name, `test-gateway oRPC client v1.todos.${procedure}`)
    assert.equal(span.attributes['orpc.status'], 'error')
    assert.equal(span.status.code, SpanStatusCode.ERROR)
    assert.equal(typeof span.attributes['orpc.duration_ms'], 'number')
    assert.equal(span.attributes['http.request.url'], `http://todo.test/nested/rpc/v1/todos/${procedure}`)
    assert.equal(span.attributes['error.type'], index === 0 ? 'TypeError' : 'string')
    assert.equal(span.attributes['http.response.status_code'], undefined)
    assert.equal(span.events[0]?.name, 'exception')
  }
})
