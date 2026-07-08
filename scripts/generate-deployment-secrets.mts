#!/usr/bin/env node
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'

export const deploymentSecretEnvNames = [
  'BETTER_AUTH_SECRET',
  'IDENTITY_INTERNAL_SERVICE_AUTH_SECRET',
  'MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64',
  'MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64',
] as const

const [betterAuthSecretEnvName, internalServiceAuthSecretEnvName, privateKeyEnvName, publicKeyEnvName] =
  deploymentSecretEnvNames

export const createDeploymentSecretsEnv = () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' }).toString()

  return {
    [betterAuthSecretEnvName]: randomBytes(32).toString('base64url'),
    [internalServiceAuthSecretEnvName]: randomBytes(32).toString('base64url'),
    [privateKeyEnvName]: Buffer.from(privateKeyPem).toString('base64url'),
    [publicKeyEnvName]: Buffer.from(publicKeyPem).toString('base64url'),
  }
}

export const renderDeploymentSecretsEnv = (env: Record<(typeof deploymentSecretEnvNames)[number], string>) =>
  deploymentSecretEnvNames.map(name => `${name}=${env[name]}`).join('\n')

const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

if (isMain) {
  console.log(renderDeploymentSecretsEnv(createDeploymentSecretsEnv()))
}
