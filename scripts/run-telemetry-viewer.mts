import { spawn } from 'node:child_process'

const defaultPort = '4318'
const port = process.env.PORT ?? process.env.OTEL_GUI_PORT ?? defaultPort
const viewerBinary = process.env.OTEL_GUI_BIN ?? 'otel-gui'

console.log('Starting local OpenTelemetry viewer:')
console.log('- Viewer: otel-gui')
console.log(`- OTLP HTTP ingest: http://localhost:${port}/v1/traces`)
console.log('- Pair with services by running pnpm dev in a separate terminal.')

const child = spawn(viewerBinary, [], {
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
})

child.once('error', error => {
  if ('code' in error && error.code === 'ENOENT') {
    console.error(`Could not find ${viewerBinary} on PATH.`)
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
