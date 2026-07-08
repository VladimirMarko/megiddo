# Megiddo

Megiddo is a TypeScript Turborepo that demonstrates clean service boundaries with a React frontend, API Gateway, Identity Service, Todo Service, public oRPC contracts, and platform seams.

For the development history and rationale behind Megiddo's architecture choices, see [Development History And Architecture Rationale](docs/reference/development-history-and-architecture-rationale.md).

## Local Development

Run the full local topology without Docker Compose:

```sh
pnpm dev
```

This starts real separate processes over localhost:

- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- Todo Service: `http://localhost:3001`
- Identity Service: `http://localhost:3002`

`pnpm dev` starts Identity and Todo with the local dummy auth profile. Identity issues inspectable dummy Identity Tokens, and Todo verifies those same tokens at its service boundary. `pnpm dev:local` is kept as an alias for the same full topology.

Local service data is stored under `.data/local-dev` by default. Set `MEGIDDO_LOCAL_DATA_DIR` to use a different directory, which is useful for Sandcastle-style isolated workspaces.

Node services and scripts do not load `.env` files themselves. T3 Env validates the runtime environment object the process receives; values should come from the shell, a process manager, package-script invocation, CI secret injection, or the `pnpm dev` local runner. The local runner injects service URLs, ports, local dummy auth, data paths, and local telemetry defaults directly into child process environments.

Frontend commands are different because Vite owns browser env loading. Vite may read its normal `.env`, `.env.local`, `.env.[mode]`, and `.env.[mode].local` files, but browser-visible values still need the `VITE_` prefix and explicit frontend env contract wiring.

### Local Telemetry Viewer

Services started by `pnpm dev` emit best-effort OpenTelemetry traces to `http://localhost:4318`. The selected local viewer is `otel-gui`, and it is started separately so Service startup never waits for viewer availability.

Run the viewer in one terminal:

```sh
nix develop
pnpm telemetry:viewer
```

Run the Megiddo services in another terminal:

```sh
pnpm dev
```

The Nix development shell provides the pinned `otel-gui` release artifact from `flake.lock`, and the viewer command sets `PORT=4318` for OTLP HTTP ingestion. If needed, override the executable with `OTEL_GUI_BIN=/path/to/otel-gui pnpm telemetry:viewer`.

Individual service scripts are available when you want separate terminals:

```sh
pnpm dev:identity
pnpm dev:todo
pnpm dev:api
pnpm dev:frontend
```

When running services manually for the local dummy workflow, set `MEGIDDO_AUTH_PROFILE=local-dummy` for Identity and Todo. Also point API at the backend services with `IDENTITY_SERVICE_URL` and `TODO_SERVICE_URL` if you are not using the default ports.

`pnpm dev:turbo` runs the lower-level Turbo dev task directly. It does not inject the local dummy auth profile or service URLs, so it is not the full authenticated app workflow.

## Tests

Run formatting and coding-standard compliance checks:

```sh
pnpm check
```

This runs Biome with fixes and a custom frontend API Adapter seam rule. The custom rule prevents frontend UI files from importing `@megiddo/contracts` or raw oRPC clients directly; contract-to-UI and oRPC mapping belongs in `apps/frontend/src/api/`.

Run focused behavior and architecture tests:

Focused tests stay fast and do not require real backend services:

```sh
pnpm test
```

The localhost integration workflow starts real Identity, Todo, and API service processes and drives the authenticated frontend-facing todo path through the production Frontend API Adapter:

```sh
pnpm test:integration:local
```

Contract smoke tests are intentionally thin. They prove runtime routing, validation, auth/error mapping, and representative success paths instead of duplicating TypeScript type checks.
