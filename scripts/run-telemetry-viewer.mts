import { spawn } from 'node:child_process'
import { createTelemetryViewerScriptConfig, createTelemetryViewerScriptEnv } from './script-config-builder.mjs'

const config = createTelemetryViewerScriptConfig(createTelemetryViewerScriptEnv(process.env))

console.log('Starting local OpenTelemetry viewer:')
console.log('- Viewer: otel-gui')
console.log(`- OTLP HTTP ingest: http://localhost:${config.otlpHttpPort}/v1/traces`)
console.log('- Pair with services by running pnpm dev in a separate terminal.')

const child = spawn(config.viewerBinary, [], {
  env: { ...process.env, PORT: config.otlpHttpPort },
  stdio: 'inherit',
})

child.once('error', error => {
  if ('code' in error && error.code === 'ENOENT') {
    console.error(`Could not find ${config.viewerBinary} on PATH.`)
    console.error(
      'Install otel-gui from https://github.com/metafab/otel-gui/releases, or set OTEL_GUI_BIN to the downloaded executable path.',
    )
    console.error(
      'The selected viewer is not added to flake.nix because no stable nixpkgs package was verified for this repo.',
    )
    process.exit(127)
  }

  throw error
})

child.once('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
