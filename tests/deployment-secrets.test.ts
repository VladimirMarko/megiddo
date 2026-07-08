import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { createJwtJwsIdentityTokenCodec } from '@megiddo/platform'

const execFileAsync = promisify(execFile)

const parseEnvOutput = (stdout: string) =>
  Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map(line => {
        const separatorIndex = line.indexOf('=')
        assert.notEqual(separatorIndex, -1, `Expected env assignment line, got: ${line}`)

        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )

test('deployment secret generator emits runtime env compatible with production-mode Identity tokens without writing files', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'megiddo-deployment-secrets-'))

  try {
    const { stderr, stdout } = await execFileAsync(
      join(process.cwd(), 'node_modules', '.bin', 'tsx'),
      [join(process.cwd(), 'scripts', 'generate-deployment-secrets.mts')],
      { cwd },
    )
    assert.equal(stderr, '')

    const env = parseEnvOutput(stdout)
    assert.deepEqual(Object.keys(env).toSorted(), [
      'BETTER_AUTH_SECRET',
      'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET',
      'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64',
      'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64',
    ])
    assert.match(env.BETTER_AUTH_SECRET, /^[A-Za-z0-9_-]{43}$/)
    assert.match(env.IDENTITY_INTERNAL_SERVICE_AUTH_SECRET, /^[A-Za-z0-9_-]{43}$/)

    const privateKeyPem = Buffer.from(env.MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64, 'base64url').toString('utf8')
    const publicKeyPem = Buffer.from(env.MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64, 'base64url').toString('utf8')
    assert.match(privateKeyPem, /^-----BEGIN PRIVATE KEY-----\n/)
    assert.match(publicKeyPem, /^-----BEGIN PUBLIC KEY-----\n/)

    const codec = createJwtJwsIdentityTokenCodec({ env })
    const identityToken = await codec.issueIdentityToken({
      audience: { service: 'todo' },
      contractVersion: 'v1',
      subject: 'user:deployment-secret-check',
    })
    const claims = await codec.verifyIdentityToken({ audience: { service: 'todo' }, identityToken })
    assert.equal(claims.subject, 'user:deployment-secret-check')
    assert.deepEqual(await readdir(cwd), [])
  } finally {
    await rm(cwd, { force: true, recursive: true })
  }
})
