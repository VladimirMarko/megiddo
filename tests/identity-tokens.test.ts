import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createIdentityApp } from '@megiddo/identity'
import { createDevelopmentIdentityTokenCodec } from '@megiddo/platform'
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
  const response = await postRpc(identityApp, '/rpc/v1/development/identityTokens/issue', {
    audience: { service },
    contractVersion: 'v1',
    subject,
  })

  assert.equal(response.status, 200)

  const body = (await response.json()) as { json: { identityToken: string } }
  return body.json.identityToken
}

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
