#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createDeploymentSecretsEnv, deploymentSecretEnvNames } from './generate-deployment-secrets.mts'

const composeUpDisplay = 'docker compose up --build --wait --detach'
const healthCheckExpression = (url: string) =>
  `fetch('${url}').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))`

interface CommandStep {
  args: string[]
  command: string
  name: string
}

const runCommand = async ({ args, command, name }: CommandStep, env: NodeJS.ProcessEnv) => {
  console.log(`\n> ${name}`)

  return await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', error => {
      reject(new Error(`${name} failed to start: ${error.message}`))
    })
    child.on('exit', code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${name} exited with code ${code ?? 'unknown'}`))
    })
  })
}

const publicHealthCheck = (url: string): CommandStep => ({
  args: ['-e', healthCheckExpression(url)],
  command: 'node',
  name: `verify ${url}`,
})

const privateHealthCheck = (url: string): CommandStep => ({
  args: ['compose', 'exec', '-T', 'api', 'node', '-e', healthCheckExpression(url)],
  command: 'docker',
  name: `verify private ${url}`,
})

const composeUpStep: CommandStep = {
  args: ['compose', 'up', '--build', '--wait', '--detach'],
  command: 'docker',
  name: composeUpDisplay,
}

const healthCheckSteps = [
  publicHealthCheck('http://localhost:5173/health'),
  publicHealthCheck('http://localhost:3000/health'),
  privateHealthCheck('http://identity:3002/health'),
  privateHealthCheck('http://todo:3001/health'),
]

const createRehearsalEnv = () => {
  const generatedSecrets = createDeploymentSecretsEnv()
  const env = { ...process.env }
  const generatedNames: string[] = []

  for (const name of deploymentSecretEnvNames) {
    if (!env[name]) {
      env[name] = generatedSecrets[name]
      generatedNames.push(name)
    }
  }

  return { env, generatedNames }
}

const { env, generatedNames } = createRehearsalEnv()

if (generatedNames.length > 0) {
  console.log(`Generated ephemeral Compose rehearsal secrets for: ${generatedNames.join(', ')}`)
}

await runCommand(composeUpStep, env)

for (const step of healthCheckSteps) {
  await runCommand(step, env)
}

console.log('\nCompose deployment rehearsal is running and healthy.')
