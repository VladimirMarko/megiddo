import assert from 'node:assert/strict'
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createDevelopmentIdentityTokenKeyPairEnv } from '@megiddo/platform'
import { createFrontendApi } from '../../apps/frontend/src/api/frontend-api-adapter'

const workspaceRoot = new URL('../..', import.meta.url).pathname

const getFreePort = async () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, () => {
      const address = server.address()
      assert.equal(typeof address, 'object')
      assert.ok(address)
      const port = address.port
      server.close(error => (error ? reject(error) : resolve(port)))
    })
  })

const waitForHealth = async (url: string, logs: () => string) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 10_000) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Service may still be starting.
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  throw new Error(`Timed out waiting for ${url}\n${logs()}`)
}

const startService = async ({
  env,
  healthUrl,
  packageName,
}: {
  env: NodeJS.ProcessEnv
  healthUrl: string
  packageName: string
}) => {
  const child = spawn('pnpm', ['--filter', packageName, 'dev'], {
    cwd: workspaceRoot,
    detached: true,
    env: { ...process.env, ...env },
  })
  const chunks: string[] = []
  const logs = () => chunks.join('')

  child.stdout.on('data', chunk => chunks.push(chunk.toString()))
  child.stderr.on('data', chunk => chunks.push(chunk.toString()))

  try {
    await waitForHealth(healthUrl, logs)
  } catch (error) {
    stopService(child)
    throw error
  }

  return { child, logs }
}

const stopService = (child: ChildProcessWithoutNullStreams) => {
  if (!child.killed && child.pid) {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // The service may already have exited after a failed startup.
    }
  }
}

test('local development workflow runs real services over localhost for the authenticated todo path', async () => {
  const [apiPort, identityPort, todoPort] = await Promise.all([getFreePort(), getFreePort(), getFreePort()])
  const dataDirectory = await mkdtemp(join(tmpdir(), 'megiddo-local-dev-'))
  const tokenEnv = await createDevelopmentIdentityTokenKeyPairEnv()
  const identityUrl = `http://127.0.0.1:${identityPort}`
  const todoUrl = `http://127.0.0.1:${todoPort}`
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const services: Array<Awaited<ReturnType<typeof startService>>> = []

  try {
    services.push(
      await startService({
        env: {
          ...tokenEnv,
          IDENTITY_DATABASE_PATH: join(dataDirectory, 'identity.sqlite'),
          PORT: String(identityPort),
        },
        healthUrl: `${identityUrl}/health`,
        packageName: '@megiddo/identity',
      }),
    )
    services.push(
      await startService({
        env: { ...tokenEnv, PORT: String(todoPort), TODO_DATABASE_PATH: join(dataDirectory, 'todo.sqlite') },
        healthUrl: `${todoUrl}/health`,
        packageName: '@megiddo/todo',
      }),
    )
    services.push(
      await startService({
        env: {
          ...tokenEnv,
          IDENTITY_SERVICE_URL: identityUrl,
          PORT: String(apiPort),
          TODO_SERVICE_URL: todoUrl,
        },
        healthUrl: `${apiUrl}/health`,
        packageName: '@megiddo/api',
      }),
    )

    const frontendApi = createFrontendApi({ baseUrl: apiUrl })

    assert.deepEqual(await frontendApi.getGatewayStatus(), {
      message: 'frontend is connected',
      service: 'api-gateway',
    })
    assert.deepEqual(await frontendApi.signInDevelopment({ subject: 'dev:localhost' }), {
      state: 'logged-in',
      user: { id: 'dev:localhost' },
    })

    const created = await frontendApi.createTodo({ title: 'Local service boundary todo' })
    const completed = await frontendApi.completeTodo({ id: created.id })
    const todos = await frontendApi.listTodos()

    assert.match(created.id, /^todo-/)
    assert.deepEqual(created, { id: created.id, title: 'Local service boundary todo', status: 'open' })
    assert.deepEqual(completed, { ...created, status: 'completed' })
    assert.deepEqual(todos, [completed])
  } catch (error) {
    const serviceLogs = services.map(({ logs }) => logs()).join('\n')
    assert.fail(`${error instanceof Error ? error.stack : String(error)}\n${serviceLogs}`)
  } finally {
    for (const { child } of services.toReversed()) {
      stopService(child)
    }
  }
})
