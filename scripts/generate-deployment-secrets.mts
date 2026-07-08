#!/usr/bin/env node
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const secretEnvName = 'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET'
const privateKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64'
const publicKeyEnvName = 'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64'

export const createDeploymentSecretsEnv = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString()

  return {
    [secretEnvName]: randomBytes(32).toString('base64url'),
    [privateKeyEnvName]: Buffer.from(privateKeyPem).toString('base64url'),
    [publicKeyEnvName]: Buffer.from(publicKeyPem).toString('base64url'),
  }
}

export const renderDeploymentSecretsEnv = (env: Record<string, string>) =>
  [secretEnvName, privateKeyEnvName, publicKeyEnvName].map(name => `${name}=${env[name]}`).join('\n')

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (isMain) {
  console.log(renderDeploymentSecretsEnv(createDeploymentSecretsEnv()))
}
