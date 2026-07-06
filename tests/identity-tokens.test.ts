import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createIdentityApp } from '@megiddo/identity'
import {
  createDummyIdentityTokenCodec,
  createJwtJwsIdentityTokenCodec,
  createJwtJwsIdentityTokenKeyPairEnv,
  internalServiceHeader,
  internalServiceSecretHeader,
} from '@megiddo/platform'
import { createTodoApp, createTodoEnv, createTodoServiceConfig, createTodoServiceInfrastructure } from '@megiddo/todo'
import { identityServiceConfigFromEnv } from './support/identity-service-config'

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

const encodeJson = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

test('Identity issues JWT/JWS Identity Tokens that Todo verifies for owner-only access', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
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

test('JWT/JWS Identity Token codec signs standard JWT claims and validates verifier inputs', async () => {
  const codec = createJwtJwsIdentityTokenCodec({ tokenTtlSeconds: 60 })
  const identityToken = await codec.issueIdentityToken({
    audience: { service: 'todo' },
    contractVersion: 'v1',
    subject: 'user:ada',
  })
  const [encodedHeader, encodedPayload, encodedSignature, extra] = identityToken.split('.')

  assert.ok(encodedHeader)
  assert.ok(encodedPayload)
  assert.ok(encodedSignature)
  assert.equal(extra, undefined)

  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  assert.deepEqual(header, { alg: 'EdDSA', kid: 'local-development', typ: 'JWT' })
  assert.equal(payload.iss, 'megiddo.identity')
  assert.equal(payload.sub, 'user:ada')
  assert.equal(payload.aud, 'todo')
  assert.equal(typeof payload.iat, 'number')
  assert.equal(typeof payload.exp, 'number')
  assert.equal(payload.contractVersion, 'v1')

  const claims = await codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken })
  assert.equal(claims.subject, 'user:ada')
  assert.deepEqual(claims.audience, { service: 'todo' })
  assert.equal(claims.contractVersion, 'v1')
  assert.equal(claims.issuedAt, payload.iat * 1000)

  await assert.rejects(
    codec.verifyIdentityToken({ audience: { service: 'api-gateway' }, identityToken }),
    /Identity Token audience mismatch: expected api-gateway/,
  )

  const expiredCodec = createJwtJwsIdentityTokenCodec({ tokenTtlSeconds: -1 })
  const expiredToken = await expiredCodec.issueIdentityToken({ audience: { service: 'todo' }, subject: 'user:ada' })
  await assert.rejects(
    expiredCodec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken: expiredToken }),
    /Identity Token expired/,
  )

  await assert.rejects(
    codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken: 'not-a-jwt' }),
    /Invalid JWT\/JWS Identity Token format/,
  )

  const unsupportedHeaderToken = `${encodeJson({ alg: 'none', typ: 'JWT' })}.${encodedPayload}.${encodedSignature}`
  await assert.rejects(
    codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken: unsupportedHeaderToken }),
    /Unsupported JWT\/JWS Identity Token header/,
  )
})

test('IDENTITY_TOKEN_CODEC=dummy selects dummy tokens through Identity token issuance', async () => {
  const identityApp = createIdentityApp({
    serviceConfig: identityServiceConfigFromEnv({ IDENTITY_TOKEN_CODEC: 'dummy' }),
  })
  const identityToken = await issueToken(identityApp, 'dummy:alice', 'todo')

  assert.match(identityToken, /^dummy\./)

  const claims = await createDummyIdentityTokenCodec().verifyIdentityToken({
    audience: { service: 'todo' },
    identityToken,
  })
  assert.equal(claims.subject, 'dummy:alice')
})

test('IDENTITY_TOKEN_CODEC=jwt-jws selects JWT/JWS tokens through the Identity to Todo seam', async () => {
  const env = { ...(await createJwtJwsIdentityTokenKeyPairEnv()), IDENTITY_TOKEN_CODEC: 'jwt-jws' }
  const identityApp = createIdentityApp({ serviceConfig: identityServiceConfigFromEnv(env) })
  const todoInfrastructure = createTodoServiceInfrastructure(createTodoServiceConfig(createTodoEnv(env)))

  try {
    const todoApp = createTodoApp({
      repository: todoInfrastructure.repository,
      tokenVerifier: todoInfrastructure.tokenVerifier,
    })
    const identityToken = await issueToken(identityApp, 'user:ada', 'todo')

    assert.doesNotMatch(identityToken, /^dummy\./)
    assert.equal(identityToken.split('.').length, 3)

    const createdResponse = await postRpc(todoApp, '/rpc/v1/todos/create', {
      identityToken,
      title: 'JWT/JWS todo',
    })
    assert.equal(createdResponse.status, 200)
  } finally {
    todoInfrastructure.close()
  }
})

test('Identity protects browser-session service-token issuance for Gateway Todo calls', async () => {
  const codec = createJwtJwsIdentityTokenCodec()
  const identityApp = createIdentityApp({
    serviceConfig: identityServiceConfigFromEnv({ IDENTITY_INTERNAL_SERVICE_AUTH_SECRET: 'test-secret' }),
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
