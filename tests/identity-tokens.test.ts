import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createIdentityApp } from '@megiddo/identity'
import {
  createDevelopmentIdentityTokenCodec,
  createDummyIdentityTokenCodec,
  internalServiceHeader,
  internalServiceSecretHeader,
} from '@megiddo/platform'
import { createTodoApp } from '@megiddo/todo'

const postRpc = (
  app: { request: (path: string, init: RequestInit) => Promise<Response> },
  path: string,
  json: unknown,
) =>
  app.request(path, {
    body: JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

const issueToken = async (identityApp: ReturnType<typeof createIdentityApp>, subject: string, service: string) => {
  const response = await postRpcWithHeaders(
    identityApp,
    '/rpc/v1/development/identityTokens/issue',
    {
      audience: { service },
      contractVersion: 'v1',
      subject,
    },
    {
      [internalServiceHeader]: 'test-harness',
      [internalServiceSecretHeader]: 'local-development-internal-service-secret',
    },
  )

  assert.equal(response.status, 200)

  const body = (await response.json()) as { json: { identityToken: string } }
  return body.json.identityToken
}

const postRpcWithHeaders = (
  app: { request: (path: string, init: RequestInit) => Promise<Response> },
  path: string,
  json: unknown,
  headers: HeadersInit,
) =>
  app.request(path, {
    body: JSON.stringify({ json }),
    headers: { 'content-type': 'application/json', ...headers },
    method: 'POST',
  })

const encodeDummyClaims = (claims: unknown) => `dummy.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`

test('Identity issues development Identity Tokens that Todo verifies for owner-only access', async () => {
  const codec = createDevelopmentIdentityTokenCodec()
  const identityApp = createIdentityApp({ tokenSigner: codec })
  const todoApp = createTodoApp({ tokenVerifier: codec })

  const adaTodoToken = await issueToken(identityApp, 'dev:ada', 'todo')
  const graceTodoToken = await issueToken(identityApp, 'dev:grace', 'todo')
  const apiAudienceToken = await issueToken(identityApp, 'dev:ada', 'api-gateway')

  const createdResponse = await postRpc(todoApp, '/rpc/v1/todos/create', {
    identityToken: adaTodoToken,
    title: 'Ada-only todo',
  })
  assert.equal(createdResponse.status, 200)
  const created = (await createdResponse.json()) as { json: { id: string; title: string; completed: boolean } }

  const adaListResponse = await postRpc(todoApp, '/rpc/v1/todos/list', { identityToken: adaTodoToken })
  assert.equal(adaListResponse.status, 200)
  assert.deepEqual(await adaListResponse.json(), { json: [created.json] })

  const graceListResponse = await postRpc(todoApp, '/rpc/v1/todos/list', { identityToken: graceTodoToken })
  assert.equal(graceListResponse.status, 200)
  assert.deepEqual(await graceListResponse.json(), { json: [] })

  const wrongAudienceResponse = await postRpc(todoApp, '/rpc/v1/todos/list', { identityToken: apiAudienceToken })
  assert.equal(wrongAudienceResponse.status, 401)
})

test('dummy Identity Token codec issues inspectable unsigned tokens and validates verifier inputs', async () => {
  const codec = createDummyIdentityTokenCodec()
  const identityToken = await codec.issueIdentityToken({
    audience: { service: 'todo' },
    contractVersion: 'v1',
    subject: 'dummy:alice',
  })

  assert.match(identityToken, /^dummy\.[A-Za-z0-9_-]+$/)

  const claims = await codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken })
  assert.equal(claims.subject, 'dummy:alice')
  assert.deepEqual(claims.audience, { service: 'todo' })
  assert.equal(claims.contractVersion, 'v1')
  assert.equal(typeof claims.issuedAt, 'number')

  const decodedClaims = JSON.parse(Buffer.from(identityToken.slice('dummy.'.length), 'base64url').toString('utf8'))
  assert.equal(decodedClaims.subject, 'dummy:alice')

  await assert.rejects(
    codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken: 'not-dummy.token' }),
    /Invalid dummy Identity Token format/,
  )
  await assert.rejects(
    codec.verifyIdentityToken({ audience: { service: 'api-gateway' }, identityToken }),
    /Identity Token audience mismatch: expected api-gateway/,
  )
  await assert.rejects(
    codec.verifyIdentityToken({
      audience: { service: 'todo' },
      identityToken: encodeDummyClaims({
        audience: { service: 'todo' },
        expiresAt: Date.now() - 1,
        issuedAt: Date.now(),
        subject: 'dummy:alice',
      }),
    }),
    /Identity Token expired/,
  )
  await assert.rejects(
    codec.verifyIdentityToken({
      audience: { service: 'todo' },
      identityToken: encodeDummyClaims({ audience: { service: 'todo' }, issuedAt: Date.now() }),
    }),
    /Invalid dummy Identity Token claims/,
  )
})

test('IDENTITY_TOKEN_CODEC=dummy selects dummy tokens through Identity token issuance', async () => {
  const identityApp = createIdentityApp({ env: { IDENTITY_TOKEN_CODEC: 'dummy' } })
  const identityToken = await issueToken(identityApp, 'dummy:alice', 'todo')

  assert.match(identityToken, /^dummy\./)

  const claims = await createDummyIdentityTokenCodec().verifyIdentityToken({
    audience: { service: 'todo' },
    identityToken,
  })
  assert.equal(claims.subject, 'dummy:alice')
})

test('Identity protects browser-session service-token issuance for Gateway Todo calls', async () => {
  const codec = createDevelopmentIdentityTokenCodec()
  const identityApp = createIdentityApp({
    env: { IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: 'test-secret' },
    tokenSigner: codec,
  })

  const signInResponse = await postRpc(identityApp, '/rpc/v1/auth/signIn', {
    method: 'dummy',
    principalId: 'dummy:alice',
  })
  assert.equal(signInResponse.status, 200)
  const signedIn = (await signInResponse.json()) as { json: { browserSession: { id: string } } }

  const publicDevelopmentTokenResponse = await postRpc(identityApp, '/rpc/v1/development/identityTokens/issue', {
    audience: { service: 'analytics' },
    contractVersion: 'v1',
    subject: 'dummy:bob',
  })
  assert.equal(publicDevelopmentTokenResponse.status, 401)

  const publicResponse = await postRpc(identityApp, '/rpc/v1/internal/identityTokens/issueForBrowserSession', {
    audience: { service: 'todo' },
    contractVersion: 'v1',
    sessionId: signedIn.json.browserSession.id,
  })
  assert.equal(publicResponse.status, 401)

  const disallowedAudienceResponse = await postRpcWithHeaders(
    identityApp,
    '/rpc/v1/internal/identityTokens/issueForBrowserSession',
    {
      audience: { service: 'analytics' },
      contractVersion: 'v1',
      sessionId: signedIn.json.browserSession.id,
    },
    {
      [internalServiceHeader]: 'api-gateway',
      [internalServiceSecretHeader]: 'test-secret',
    },
  )
  assert.equal(disallowedAudienceResponse.status, 403)

  const issueResponse = await postRpcWithHeaders(
    identityApp,
    '/rpc/v1/internal/identityTokens/issueForBrowserSession',
    {
      audience: { service: 'todo' },
      contractVersion: 'v1',
      sessionId: signedIn.json.browserSession.id,
    },
    {
      [internalServiceHeader]: 'api-gateway',
      [internalServiceSecretHeader]: 'test-secret',
    },
  )
  assert.equal(issueResponse.status, 200)

  const issued = (await issueResponse.json()) as { json: { identityToken: string; user: { id: string } } }
  const claims = await codec.verifyIdentityToken({
    audience: { service: 'todo' },
    identityToken: issued.json.identityToken,
  })

  assert.equal(issued.json.user.id, 'dummy:alice')
  assert.equal(claims.subject, 'dummy:alice')
})
