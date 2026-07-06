import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createDummyIdentityTokenCodec } from '@megiddo/platform'
import { createTodoApp, createTodoEnv, createTodoServiceConfig, createTodoServiceInfrastructure } from '@megiddo/todo'

type TestApp = { request: (path: string, init?: RequestInit) => Promise<Response> }

const postRpc = (app: TestApp, path: string, json?: unknown) =>
  app.request(path, {
    body: json === undefined ? '{}' : JSON.stringify({ json }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

test('Todo env validates defaults from an explicit empty runtime env', () => {
  const env = createTodoEnv({})

  assert.deepEqual(env, {
    MEGIDDO_AUTH_PROFILE: undefined,
    MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64: undefined,
    IDENTITY_TOKEN_CODEC: undefined,
    PORT: 3001,
    TODO_DATABASE_PATH: '.data/todo/todo.sqlite',
  })
})

test('Todo env rejects invalid enum values', () => {
  assert.throws(() => createTodoEnv({ IDENTITY_TOKEN_CODEC: 'oauth' }), /Invalid environment variables/)
  assert.throws(() => createTodoEnv({ MEGIDDO_AUTH_PROFILE: 'production' }), /Invalid environment variables/)
})

test('Todo env parses PORT as a TCP port number', () => {
  assert.equal(createTodoEnv({ PORT: '4321' }).PORT, 4321)

  assert.throws(() => createTodoEnv({ PORT: '0' }), /Invalid environment variables/)
  assert.throws(() => createTodoEnv({ PORT: '65536' }), /Invalid environment variables/)
  assert.throws(() => createTodoEnv({ PORT: 'not-a-port' }), /Invalid environment variables/)
})

test('Todo service config derives effective identity token codec', () => {
  assert.equal(
    createTodoServiceConfig(createTodoEnv({ MEGIDDO_AUTH_PROFILE: 'local-dummy' })).identityTokenCodec,
    'dummy',
  )
  assert.equal(createTodoServiceConfig(createTodoEnv({})).identityTokenCodec, 'jwt-jws')
  assert.equal(
    createTodoServiceConfig(createTodoEnv({ IDENTITY_TOKEN_CODEC: 'jwt-jws', MEGIDDO_AUTH_PROFILE: 'local-dummy' }))
      .identityTokenCodec,
    'jwt-jws',
  )
  assert.equal(createTodoServiceConfig(createTodoEnv({ IDENTITY_TOKEN_CODEC: 'dummy' })).identityTokenCodec, 'dummy')
})

test('Todo service infrastructure is wired from derived service config', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'megiddo-todo-config-'))
  const databasePath = join(directory, 'todo.sqlite')
  const config = createTodoServiceConfig(
    createTodoEnv({ IDENTITY_TOKEN_CODEC: 'dummy', TODO_DATABASE_PATH: databasePath }),
  )
  const infrastructure = createTodoServiceInfrastructure(config)

  try {
    const app = createTodoApp({ repository: infrastructure.repository, tokenVerifier: infrastructure.tokenVerifier })
    const identityToken = await createDummyIdentityTokenCodec().issueIdentityToken({
      audience: { service: 'todo' },
      contractVersion: 'v1',
      subject: 'dummy:alice',
    })

    const response = await postRpc(app, '/rpc/v1/todos/create', { identityToken, title: 'Config-wired todo' })

    assert.equal(response.status, 200)
    assert.equal(existsSync(databasePath), true)
  } finally {
    infrastructure.close()
    await rm(directory, { force: true, recursive: true })
  }
})
