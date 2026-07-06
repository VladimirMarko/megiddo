import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createIdentityApp } from '@megiddo/identity'

const postRpc = (app: ReturnType<typeof createIdentityApp>, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

test('Identity exposes seeded dummy auth capabilities and signs in only existing dummy principals', async () => {
  const app = createIdentityApp({ env: { MEGIDDO_AUTH_PROFILE: 'local-dummy' } })

  const capabilitiesResponse = await postRpc(app, '/rpc/v1/auth/capabilities')
  assert.equal(capabilitiesResponse.status, 200)
  assert.deepEqual(await capabilitiesResponse.json(), {
    json: {
      dummy: {
        accounts: [
          { displayName: 'Alice', principalId: 'dummy:alice' },
          { displayName: 'Bob', principalId: 'dummy:bob' },
        ],
        signIn: 'available',
        signUp: 'available',
      },
      signInMethods: ['dummy'],
      signUpMethods: ['dummy'],
    },
  })

  const signInResponse = await postRpc(app, '/rpc/v1/auth/signIn', {
    method: 'dummy',
    principalId: 'dummy:alice',
  })
  assert.equal(signInResponse.status, 200)

  const signIn = (await signInResponse.json()) as { json: { browserSession: { id: string }; user: { id: string } } }
  assert.equal(signIn.json.user.id, 'dummy:alice')
  assert.equal(typeof signIn.json.browserSession.id, 'string')
  assert.notEqual(signIn.json.browserSession.id, '')

  const currentResponse = await postRpc(app, '/rpc/v1/auth/current', { sessionId: signIn.json.browserSession.id })
  assert.equal(currentResponse.status, 200)
  assert.deepEqual(await currentResponse.json(), {
    json: { state: 'logged-in', user: { displayName: 'Alice', id: 'dummy:alice' } },
  })

  const signOutResponse = await postRpc(app, '/rpc/v1/auth/signOut', { sessionId: signIn.json.browserSession.id })
  assert.equal(signOutResponse.status, 200)
  assert.deepEqual(await signOutResponse.json(), { json: { state: 'logged-out' } })

  const expiredResponse = await postRpc(app, '/rpc/v1/auth/current', { sessionId: signIn.json.browserSession.id })
  assert.equal(expiredResponse.status, 200)
  assert.deepEqual(await expiredResponse.json(), { json: { state: 'expired' } })

  const unknownResponse = await postRpc(app, '/rpc/v1/auth/signIn', {
    method: 'dummy',
    principalId: 'dummy:charlie',
  })
  assert.equal(unknownResponse.status, 400)
})

test('Identity dummy sign-up persists a principal, signs in immediately, and rejects collisions', async () => {
  const app = createIdentityApp({ env: { MEGIDDO_AUTH_PROFILE: 'local-dummy' } })

  const initialCapabilitiesResponse = await postRpc(app, '/rpc/v1/auth/capabilities')
  assert.equal(initialCapabilitiesResponse.status, 200)
  assert.deepEqual(await initialCapabilitiesResponse.json(), {
    json: {
      dummy: {
        accounts: [
          { displayName: 'Alice', principalId: 'dummy:alice' },
          { displayName: 'Bob', principalId: 'dummy:bob' },
        ],
        signIn: 'available',
        signUp: 'available',
      },
      signInMethods: ['dummy'],
      signUpMethods: ['dummy'],
    },
  })

  const signUpResponse = await postRpc(app, '/rpc/v1/auth/signUp', {
    displayName: 'Charlie Example',
    method: 'dummy',
  })
  assert.equal(signUpResponse.status, 200)

  const signUp = (await signUpResponse.json()) as {
    json: { browserSession: { id: string }; user: { displayName: string; id: string } }
  }
  assert.equal(signUp.json.user.id, 'dummy:charlie-example')
  assert.equal(signUp.json.user.displayName, 'Charlie Example')
  assert.equal(typeof signUp.json.browserSession.id, 'string')
  assert.notEqual(signUp.json.browserSession.id, '')

  const updatedCapabilitiesResponse = await postRpc(app, '/rpc/v1/auth/capabilities')
  assert.equal(updatedCapabilitiesResponse.status, 200)
  assert.deepEqual(await updatedCapabilitiesResponse.json(), {
    json: {
      dummy: {
        accounts: [
          { displayName: 'Alice', principalId: 'dummy:alice' },
          { displayName: 'Bob', principalId: 'dummy:bob' },
          { displayName: 'Charlie Example', principalId: 'dummy:charlie-example' },
        ],
        signIn: 'available',
        signUp: 'available',
      },
      signInMethods: ['dummy'],
      signUpMethods: ['dummy'],
    },
  })

  const duplicateResponse = await postRpc(app, '/rpc/v1/auth/signUp', {
    displayName: 'Charlie Example',
    method: 'dummy',
  })
  assert.equal(duplicateResponse.status, 400)
})
