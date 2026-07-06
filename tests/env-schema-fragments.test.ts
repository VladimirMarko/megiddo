import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  enabledEnvFlagSchema,
  identityTokenCodecEnvSchema,
  localDummyAuthProfileEnvSchema,
  tcpPortEnvSchema,
} from '@megiddo/platform/env-schema-fragments'

test('shared env schema fragments cover repeated validation concerns without owning runtime env', () => {
  assert.equal(tcpPortEnvSchema.parse('4321'), 4321)
  assert.equal(identityTokenCodecEnvSchema.parse('jwt-jws'), 'jwt-jws')
  assert.equal(localDummyAuthProfileEnvSchema.parse('local-dummy'), 'local-dummy')
  assert.equal(enabledEnvFlagSchema.parse('enabled'), 'enabled')

  assert.equal(tcpPortEnvSchema.safeParse('0').success, false)
  assert.equal(identityTokenCodecEnvSchema.safeParse('oauth').success, false)
  assert.equal(localDummyAuthProfileEnvSchema.safeParse('production').success, false)
  assert.equal(enabledEnvFlagSchema.safeParse('disabled').success, false)
})
