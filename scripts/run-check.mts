import { spawn } from 'node:child_process'

interface CheckStep {
  args: string[]
  command: string
  forwardsPaths: boolean
  name: string
}

const paths = process.argv.slice(2)

const steps: CheckStep[] = [
  {
    args: ['scripts/check-frontend-api-adapter-seam.mts'],
    command: 'tsx',
    forwardsPaths: true,
    name: 'frontend API Adapter seam',
  },
  {
    args: ['scripts/check-raw-env-access.mts'],
    command: 'tsx',
    forwardsPaths: true,
    name: 'raw env access seam',
  },
  {
    args: ['biome', 'check', '--write'],
    command: 'pnpm',
    forwardsPaths: true,
    name: 'Biome format and lint',
  },
]

const runStep = async ({ args, command, forwardsPaths, name }: CheckStep): Promise<boolean> => {
  console.log(`\n> ${name}`)

  return await new Promise(resolve => {
    const child = spawn(command, forwardsPaths ? [...args, ...paths] : args, {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', error => {
      console.error(`${name} failed to start: ${error.message}`)
      resolve(false)
    })
    child.on('exit', code => {
      resolve(code === 0)
    })
  })
}

const failedSteps: string[] = []

for (const step of steps) {
  const passed = await runStep(step)

  if (!passed) {
    failedSteps.push(step.name)
  }
}

if (failedSteps.length > 0) {
  console.error(`\ncheck failed: ${failedSteps.join(', ')}`)
  process.exitCode = 1
}
