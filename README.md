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

Generate production-mode staging or Compose rehearsal secrets with:

```sh
pnpm secrets:deployment
```

The command prints `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET`, `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64`, and `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` as shell-style env assignments. It writes nothing by default; send the values to your deployment platform secret store rather than committing them.

For the manual Fly staging deployment procedure, see the [Staging Deployment Runbook](docs/runbooks/staging-deployment.md).

Build the local container images for the split topology with:

```sh
pnpm containers:build
```

Run the mandatory local Compose deployment rehearsal before deploying staging changes:

```sh
pnpm containers:rehearse
```

`compose.yaml` defines separate Frontend, API Gateway, Identity, and Todo Services. Frontend and API Gateway publish local ports; Identity and Todo stay on the Compose network. Identity and Todo mount named volumes at `/data` for their SQLite files, and API Gateway calls them through `http://identity:3002` and `http://todo:3001`.

`pnpm containers:rehearse` builds and starts the Compose topology, waits for Service health checks, verifies Frontend and API Gateway over published localhost ports, and verifies private Identity and Todo health through Compose internal networking. It uses any exported values from `pnpm secrets:deployment`; if they are absent, it generates ephemeral rehearsal secrets without writing them to the repo.

Compose starts Identity with `NODE_ENV=production`, Better Auth, and JWT/JWS Identity Tokens, so the rehearsal exercises the production-mode auth and token path instead of falling back to dummy auth.

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
