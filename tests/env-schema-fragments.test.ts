import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  enabledEnvFlagSchema,
  identityTokenCodecEnvSchema,
  localDummyAuthProfileEnvSchema,
  tcpPortEnvSchema,
} from '@megiddo/platform/env-schema-fragments'

const acceptedEnvFragmentValues = [
  [tcpPortEnvSchema, '4321', 4321],
  [identityTokenCodecEnvSchema, 'jwt-jws', 'jwt-jws'],
  [localDummyAuthProfileEnvSchema, 'local-dummy', 'local-dummy'],
  [enabledEnvFlagSchema, 'enabled', 'enabled'],
] as const

const rejectedEnvFragmentValues = [
  [tcpPortEnvSchema, '0'],
  [identityTokenCodecEnvSchema, 'oauth'],
  [localDummyAuthProfileEnvSchema, 'production'],
  [enabledEnvFlagSchema, 'disabled'],
] as const

test('shared env schema fragments parse accepted values', () => {
  for (const [schema, input, expected] of acceptedEnvFragmentValues) {
    assert.equal(schema.parse(input), expected)
  }
})

test('shared env schema fragments reject invalid values', () => {
  for (const [schema, input] of rejectedEnvFragmentValues) {
    assert.equal(schema.safeParse(input).success, false)
  }
})
