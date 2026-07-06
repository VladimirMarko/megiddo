import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import {
  createLocalDevResetScriptConfig,
  createLocalDevResetScriptEnv,
  createLocalDevScriptConfig,
  createLocalDevScriptEnv,
  createTelemetryViewerScriptConfig,
  createTelemetryViewerScriptEnv,
} from '../scripts/script-config-builder.mts'

const workspaceRoot = '/repo'

test('local dev script env validates defaults from an explicit empty runtime env', () => {
  const env = createLocalDevScriptEnv({})

  assert.deepEqual(env, {
    API_PORT: 3000,
    FRONTEND_PORT: 5173,
    IDENTITY_PORT: 3002,
    MEGIDDO_LOCAL_DATA_DIR: undefined,
    TODO_PORT: 3001,
  })
})

test('local dev script config derives topology inputs from validated env', () => {
  const config = createLocalDevScriptConfig(
    createLocalDevScriptEnv({
      API_PORT: '3100',
      FRONTEND_PORT: '5174',
      IDENTITY_PORT: '3102',
      MEGIDDO_LOCAL_DATA_DIR: '/tmp/megiddo-local-data',
      TODO_PORT: '3101',
    }),
    { workspaceRoot },
  )

  assert.deepEqual(config, {
    apiPort: '3100',
    dataDirectory: '/tmp/megiddo-local-data',
    frontendPort: '5174',
    identityPort: '3102',
    todoPort: '3101',
  })
})

test('local dev script config derives the default local data directory from workspace root', () => {
  const config = createLocalDevScriptConfig(createLocalDevScriptEnv({}), { workspaceRoot })

  assert.equal(config.dataDirectory, join(workspaceRoot, '.data', 'local-dev'))
})

test('local dev reset script config derives resolved data directory safety inputs', () => {
  assert.deepEqual(createLocalDevResetScriptConfig(createLocalDevResetScriptEnv({}), { workspaceRoot }), {
    dataDirectory: join(workspaceRoot, '.data', 'local-dev'),
    dataDirectoryWasConfigured: false,
    workspaceDataRoot: join(workspaceRoot, '.data'),
  })

  assert.deepEqual(
    createLocalDevResetScriptConfig(createLocalDevResetScriptEnv({ MEGIDDO_LOCAL_DATA_DIR: '../custom-data' }), {
      workspaceRoot,
    }),
    {
      dataDirectory: resolve('../custom-data'),
      dataDirectoryWasConfigured: true,
      workspaceDataRoot: join(workspaceRoot, '.data'),
    },
  )
})

test('local dev reset script env ignores unrelated local dev port variables', () => {
  const env = createLocalDevResetScriptEnv({ API_PORT: 'not-a-port' })

  assert.deepEqual(env, { MEGIDDO_LOCAL_DATA_DIR: undefined })
})

test('local dev script env rejects invalid port values', () => {
  assert.throws(() => createLocalDevScriptEnv({ API_PORT: '0' }), /Invalid environment variables/)
  assert.throws(() => createLocalDevScriptEnv({ FRONTEND_PORT: '65536' }), /Invalid environment variables/)
  assert.throws(() => createLocalDevScriptEnv({ IDENTITY_PORT: 'not-a-port' }), /Invalid environment variables/)
  assert.throws(() => createLocalDevScriptEnv({ TODO_PORT: '' }), /Invalid environment variables/)
})

test('telemetry viewer script env validates defaults from an explicit empty runtime env', () => {
  const env = createTelemetryViewerScriptEnv({})

  assert.deepEqual(env, {
    OTEL_GUI_BIN: undefined,
    OTEL_GUI_PORT: undefined,
    PORT: undefined,
  })
})

test('telemetry viewer script config preserves port precedence and viewer binary defaults', () => {
  assert.deepEqual(createTelemetryViewerScriptConfig(createTelemetryViewerScriptEnv({})), {
    otlpHttpPort: '4318',
    viewerBinary: 'otel-gui',
  })
  assert.deepEqual(createTelemetryViewerScriptConfig(createTelemetryViewerScriptEnv({ OTEL_GUI_PORT: '4320' })), {
    otlpHttpPort: '4320',
    viewerBinary: 'otel-gui',
  })
  assert.deepEqual(
    createTelemetryViewerScriptConfig(
      createTelemetryViewerScriptEnv({ OTEL_GUI_BIN: '/usr/local/bin/otel-gui', OTEL_GUI_PORT: '4320', PORT: '4319' }),
    ),
    {
      otlpHttpPort: '4319',
      viewerBinary: '/usr/local/bin/otel-gui',
    },
  )
})

test('telemetry viewer script env rejects invalid port values', () => {
  assert.throws(() => createTelemetryViewerScriptEnv({ PORT: '0' }), /Invalid environment variables/)
  assert.throws(() => createTelemetryViewerScriptEnv({ OTEL_GUI_PORT: '65536' }), /Invalid environment variables/)
  assert.throws(() => createTelemetryViewerScriptEnv({ PORT: 'not-a-port' }), /Invalid environment variables/)
})
