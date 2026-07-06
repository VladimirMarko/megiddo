import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createTodoEnv, createTodoServiceConfig } from '@megiddo/todo'

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
