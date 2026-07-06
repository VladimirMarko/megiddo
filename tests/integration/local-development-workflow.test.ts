import assert from 'node:assert/strict'
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createJwtJwsIdentityTokenKeyPairEnv } from '@megiddo/platform'
import { createFrontendApi } from '../../apps/frontend/src/api/frontend-api-adapter'
import { createCookieJarFetch } from '../support/cookie-jar-fetch'

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

const startProcess = async ({
  args,
  env,
  healthUrls,
}: {
  args: string[]
  env: NodeJS.ProcessEnv
  healthUrls: string[]
}) => {
  const child = spawn('pnpm', args, {
    cwd: workspaceRoot,
    detached: true,
    env: { ...process.env, ...env },
  })
  const chunks: string[] = []
  const logs = () => chunks.join('')

  child.stdout.on('data', chunk => chunks.push(chunk.toString()))
  child.stderr.on('data', chunk => chunks.push(chunk.toString()))

  try {
    await Promise.all(healthUrls.map(url => waitForHealth(url, logs)))
  } catch (error) {
    stopService(child)
    throw error
  }

  return { child, logs }
}

const startService = async ({
  env,
  healthUrl,
  packageName,
}: {
  env: NodeJS.ProcessEnv
  healthUrl: string
  packageName: string
}) =>
  startProcess({
    args: ['--filter', packageName, 'dev'],
    env,
    healthUrls: [healthUrl],
  })

const startLocalWorkflow = async ({
  apiUrl,
  env,
  frontendUrl,
}: {
  apiUrl: string
  env: NodeJS.ProcessEnv
  frontendUrl: string
}) => {
  return startProcess({
    args: ['dev'],
    env,
    healthUrls: [`${apiUrl}/health`, frontendUrl],
  })
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
  const identityUrl = `http://127.0.0.1:${identityPort}`
  const todoUrl = `http://127.0.0.1:${todoPort}`
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const services: Array<Awaited<ReturnType<typeof startService>>> = []

  try {
    services.push(
      await startService({
        env: {
          IDENTITY_DATABASE_PATH: join(dataDirectory, 'identity.sqlite'),
          MEGIDDO_AUTH_PROFILE: 'local-dummy',
          PORT: String(identityPort),
        },
        healthUrl: `${identityUrl}/health`,
        packageName: '@megiddo/identity',
      }),
    )
    services.push(
      await startService({
        env: {
          MEGIDDO_AUTH_PROFILE: 'local-dummy',
          PORT: String(todoPort),
          TODO_DATABASE_PATH: join(dataDirectory, 'todo.sqlite'),
        },
        healthUrl: `${todoUrl}/health`,
        packageName: '@megiddo/todo',
      }),
    )
    services.push(
      await startService({
        env: {
          IDENTITY_SERVICE_URL: identityUrl,
          PORT: String(apiPort),
          TODO_SERVICE_URL: todoUrl,
        },
        healthUrl: `${apiUrl}/health`,
        packageName: '@megiddo/api',
      }),
    )

    const frontendApi = createFrontendApi({ baseUrl: apiUrl, fetch: createCookieJarFetch() })

    assert.deepEqual(await frontendApi.getGatewayStatus(), {
      message: 'frontend is connected',
      service: 'api-gateway',
    })
    assert.deepEqual(await frontendApi.signIn({ method: 'dummy', principalId: 'dummy:alice' }), {
      state: 'logged-in',
      user: { displayName: 'Alice', id: 'dummy:alice' },
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

test('local dummy auth can run the authenticated todo path with real JWT/JWS tokens', async () => {
  const [apiPort, identityPort, todoPort] = await Promise.all([getFreePort(), getFreePort(), getFreePort()])
  const dataDirectory = await mkdtemp(join(tmpdir(), 'megiddo-local-jwt-jws-'))
  const identityUrl = `http://127.0.0.1:${identityPort}`
  const todoUrl = `http://127.0.0.1:${todoPort}`
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const jwtJwsKeyEnv = await createJwtJwsIdentityTokenKeyPairEnv()
  const services: Array<Awaited<ReturnType<typeof startService>>> = []

  try {
    services.push(
      await startService({
        env: {
          ...jwtJwsKeyEnv,
          IDENTITY_DATABASE_PATH: join(dataDirectory, 'identity.sqlite'),
          IDENTITY_TOKEN_CODEC: 'jwt-jws',
          MEGIDDO_AUTH_PROFILE: 'local-dummy',
          PORT: String(identityPort),
        },
        healthUrl: `${identityUrl}/health`,
        packageName: '@megiddo/identity',
      }),
    )
    services.push(
      await startService({
        env: {
          ...jwtJwsKeyEnv,
          IDENTITY_TOKEN_CODEC: 'jwt-jws',
          MEGIDDO_AUTH_PROFILE: 'local-dummy',
          PORT: String(todoPort),
          TODO_DATABASE_PATH: join(dataDirectory, 'todo.sqlite'),
        },
        healthUrl: `${todoUrl}/health`,
        packageName: '@megiddo/todo',
      }),
    )
    services.push(
      await startService({
        env: {
          IDENTITY_SERVICE_URL: identityUrl,
          PORT: String(apiPort),
          TODO_SERVICE_URL: todoUrl,
        },
        healthUrl: `${apiUrl}/health`,
        packageName: '@megiddo/api',
      }),
    )

    const frontendApi = createFrontendApi({ baseUrl: apiUrl, fetch: createCookieJarFetch() })

    assert.deepEqual(await frontendApi.signIn({ method: 'dummy', principalId: 'dummy:alice' }), {
      state: 'logged-in',
      user: { displayName: 'Alice', id: 'dummy:alice' },
    })
    const created = await frontendApi.createTodo({ title: 'JWT/JWS local service todo' })

    assert.deepEqual(created, { id: created.id, status: 'open', title: 'JWT/JWS local service todo' })
  } catch (error) {
    const serviceLogs = services.map(({ logs }) => logs()).join('\n')
    assert.fail(`${error instanceof Error ? error.stack : String(error)}\n${serviceLogs}`)
  } finally {
    for (const { child } of services.toReversed()) {
      stopService(child)
    }
  }
})

test('documented pnpm dev workflow supports authenticated todo creation across real local services', async () => {
  const [apiPort, identityPort, todoPort, frontendPort] = await Promise.all([
    getFreePort(),
    getFreePort(),
    getFreePort(),
    getFreePort(),
  ])
  const dataDirectory = await mkdtemp(join(tmpdir(), 'megiddo-pnpm-dev-'))
  const apiUrl = `http://127.0.0.1:${apiPort}`
  const frontendUrl = `http://127.0.0.1:${frontendPort}`
  const identityUrl = `http://127.0.0.1:${identityPort}`
  const todoUrl = `http://127.0.0.1:${todoPort}`
  const workflow = await startLocalWorkflow({
    apiUrl,
    env: {
      API_PORT: String(apiPort),
      FRONTEND_PORT: String(frontendPort),
      IDENTITY_PORT: String(identityPort),
      MEGIDDO_LOCAL_DATA_DIR: dataDirectory,
      TODO_PORT: String(todoPort),
    },
    frontendUrl,
  })

  try {
    await Promise.all([
      waitForHealth(`${identityUrl}/health`, workflow.logs),
      waitForHealth(`${todoUrl}/health`, workflow.logs),
    ])

    const frontendApi = createFrontendApi({ baseUrl: apiUrl, fetch: createCookieJarFetch() })

    assert.deepEqual(await frontendApi.getGatewayStatus(), {
      message: 'frontend is connected',
      service: 'api-gateway',
    })
    assert.deepEqual(await frontendApi.signIn({ method: 'dummy', principalId: 'dummy:bob' }), {
      state: 'logged-in',
      user: { displayName: 'Bob', id: 'dummy:bob' },
    })

    // This covers the regression where Identity accepted sign-in, but API could not
    // verify Identity's token because the dev services used different key material.
    const created = await frontendApi.createTodo({ title: 'Documented local workflow todo' })

    assert.match(created.id, /^todo-/)
    assert.deepEqual(created, { id: created.id, status: 'open', title: 'Documented local workflow todo' })
  } catch (error) {
    assert.fail(`${error instanceof Error ? error.stack : String(error)}\n${workflow.logs()}`)
  } finally {
    stopService(workflow.child)
  }
})
