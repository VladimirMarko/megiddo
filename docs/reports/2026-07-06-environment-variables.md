# Environment Variables as of 2026-07-06

This document collates the environment variables currently known from application code, scripts, tests, and existing docs. It is a snapshot, not yet an executable schema.

## Current State

- Runtime code mostly reads directly from `process.env` or `import.meta.env`.
- `apps/identity/src/identity-mode-config.ts` validates a small subset of allowed values.
- `scripts/local-dev-topology.mts` injects the local development topology values used by `pnpm dev`.
- Vite loads frontend `.env` files and exposes only client-prefixed values by default.
- Node service entrypoints do not currently load `.env` files explicitly.

## Local Development Scripts

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `API_PORT` | `scripts/run-local-dev.mts` | TCP port string | `3000` | Passed to API as `PORT`. |
| `FRONTEND_PORT` | `scripts/run-local-dev.mts` | TCP port string | `5173` | Passed to frontend Vite with `--port` and as `PORT`. |
| `IDENTITY_PORT` | `scripts/run-local-dev.mts` | TCP port string | `3002` | Passed to Identity as `PORT`. |
| `MEGIDDO_LOCAL_DATA_DIR` | `scripts/run-local-dev.mts`, `scripts/reset-local-dev-data.mts` | filesystem path | `.data/local-dev` under workspace root | Controls local service data directory. |
| `TODO_PORT` | `scripts/run-local-dev.mts` | TCP port string | `3001` | Passed to Todo as `PORT`. |

## Telemetry And Viewer

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | local dev topology, OpenTelemetry SDK | URL | `http://localhost:4318` in `pnpm dev` | Consumed by the OTLP exporter package, not directly by Megiddo code. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | local dev topology, OpenTelemetry SDK | currently `http/protobuf` in local dev | `http/protobuf` in `pnpm dev` | Consumed by the OTLP exporter package. |
| `OTEL_GUI_BIN` | `scripts/run-telemetry-viewer.mts` | executable path or command name | `otel-gui` | Overrides the telemetry viewer binary. |
| `OTEL_GUI_PORT` | `scripts/run-telemetry-viewer.mts` | TCP port string | `4318` unless `PORT` is set | Viewer ingest port fallback. |
| `OTEL_SERVICE_NAME` | `packages/platform/src/local-telemetry.ts`, local dev topology | service name string | `megiddo-service` if unset; service-specific in `pnpm dev` | Used as OpenTelemetry `service.name`. |
| `OTEL_TRACES_EXPORTER` | `packages/platform/src/local-telemetry.ts`, local dev topology | `otlp` enables local telemetry | unset disables Megiddo local telemetry setup | Other values are ignored by Megiddo's local telemetry setup. |
| `PORT` | `scripts/run-telemetry-viewer.mts` | TCP port string | `4318` for viewer when `OTEL_GUI_PORT` is unset | Takes precedence over `OTEL_GUI_PORT` for the viewer command. |

## API Gateway

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | `apps/api/src/identity-service-client.ts`, `apps/identity/src/app.ts` | non-empty secret string | platform default internal-service secret | Must match between API and Identity for internal Identity token issuance calls. |
| `IDENTITY_SERVICE_URL` | `apps/api/src/app.ts` | URL | `http://localhost:3002` via client default | API uses this to call Identity. |
| `PORT` | `apps/api/src/server.ts` | TCP port string | `3000` | API listen port. |
| `TODO_SERVICE_URL` | `apps/api/src/app.ts` | URL | `http://localhost:3001` via client default | API uses this to call Todo. |

## Identity Service

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `BETTER_AUTH_URL` | `apps/identity/src/app.ts`, `apps/identity/src/server.ts` | URL | unset | Preferred base URL for embedded Better Auth. Falls back to `IDENTITY_BETTER_AUTH_BASE_URL`. |
| `IDENTITY_AUTH_PROVIDER` | `apps/identity/src/identity-mode-config.ts` | `dummy`, `better-auth` | `dummy` | `dummy` is rejected when `NODE_ENV=production`. |
| `IDENTITY_BETTER_AUTH_BASE_URL` | `apps/identity/src/app.ts`, `apps/identity/src/server.ts` | URL | unset | Legacy or service-specific Better Auth base URL fallback. |
| `IDENTITY_BETTER_AUTH_DATABASE_PATH` | `apps/identity/src/app.ts`, `apps/identity/src/server.ts` | filesystem path | `.data/identity/better-auth.sqlite` in server entrypoint; unset in app factory | Better Auth SQLite database path. |
| `IDENTITY_DATABASE_PATH` | `apps/identity/src/server.ts` | filesystem path | `.data/identity/identity.sqlite` | Dummy auth persistence path in the server entrypoint. |
| `IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS` | `apps/identity/src/server.ts` | `enabled` seeds demo accounts | disabled unless set, or unless `MEGIDDO_AUTH_PROFILE=local-dummy` | Seeds Alice and Bob dummy accounts. |
| `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | `apps/identity/src/app.ts` | non-empty secret string | platform default internal-service secret | Must match API for internal calls. |
| `IDENTITY_TOKEN_CODEC` | `apps/identity/src/identity-mode-config.ts`, `apps/todo/src/app.ts` | `dummy`, `jwt-jws` | `dummy` in Identity; Todo uses dummy when set to `dummy` or when profile is `local-dummy` and unset | `dummy` is rejected by Identity when `NODE_ENV=production`. |
| `MEGIDDO_AUTH_PROFILE` | `apps/identity/src/identity-mode-config.ts`, `apps/identity/src/server.ts`, `apps/todo/src/app.ts` | `local-dummy` | unset | Local convenience profile. Current validation only accepts `local-dummy` if set. |
| `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64` | `packages/platform/src/index.ts` | base64url-encoded PEM private key | required when using JWT/JWS signing without explicit key option | Used by JWT/JWS Identity token codec. |
| `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | `packages/platform/src/index.ts` | base64url-encoded PEM public key | required when using JWT/JWS verification without explicit key option | Used by JWT/JWS Identity token codec. |
| `NODE_ENV` | `apps/identity/src/identity-mode-config.ts`, Vite/tooling | commonly `development`, `test`, `production` | runtime/tooling-defined | Identity rejects dummy auth provider and dummy token codec when `production`. |
| `PORT` | `apps/identity/src/server.ts` | TCP port string | `3002` | Identity listen port. |

## Todo Service

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `IDENTITY_TOKEN_CODEC` | `apps/todo/src/app.ts` | `dummy`, `jwt-jws` by convention | JWT/JWS unless set to `dummy` or `MEGIDDO_AUTH_PROFILE=local-dummy` while unset | Todo currently only branches on dummy; any other value falls through to JWT/JWS. |
| `MEGIDDO_AUTH_PROFILE` | `apps/todo/src/app.ts` | `local-dummy` by convention | unset | Selects dummy token verification when `IDENTITY_TOKEN_CODEC` is unset. |
| `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | `packages/platform/src/index.ts` | base64url-encoded PEM public key | required when using JWT/JWS verification without explicit key option | Todo needs this for JWT/JWS token verification. |
| `PORT` | `apps/todo/src/server.ts` | TCP port string | `3001` | Todo listen port. |
| `TODO_DATABASE_PATH` | `apps/todo/src/server.ts` | filesystem path | `.data/todo/todo.sqlite` | Todo SQLite database path. |

## Frontend

| Variable | Used by | Allowed values | Default | Notes |
| --- | --- | --- | --- | --- |
| `PORT` | `scripts/local-dev-topology.mts`, Vite/dev tooling | TCP port string | `5173` in `pnpm dev` topology | Vite command receives `--port`; this variable is also passed through. |
| `UI_DUMMY_AUTH_LOGIN_SHORTCUT` | `apps/frontend/src/main.ts` | `enabled` | disabled | Read from `import.meta.env`, but Vite only exposes unprefixed env values to client code if configured to do so. No custom `envPrefix` was found. |
| `VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT` | `apps/frontend/src/main.ts` | `enabled` | disabled | Vite-safe client-exposed equivalent. This is the reliable frontend env key under default Vite behavior. |

## `.env` Loading

- Vite loads `.env`, `.env.local`, `.env.[mode]`, and `.env.[mode].local` for the frontend. Only `VITE_` variables are exposed to browser code by default.
- Node services and scripts read `process.env`, but no explicit `.env` loader was found in the Node entrypoints or scripts.
- Shell-provided environment variables work for all current Node services and scripts.
- `pnpm dev` programmatically injects many local-development values instead of relying on `.env` files.

## Implementation Notes For A Future Env Contract

- Client-facing and server-only variables need separate schemas. Otherwise frontend validation can either fail on missing server secrets or accidentally expose server secrets.
- Vite statically replaces `import.meta.env` during build. Dynamic access and raw schema iteration can miss variables unless each public key is explicitly listed in the runtime env object.
- `process.env` values are strings. Typed schemas should expose parsed values through an accessor object rather than pretending `process.env` itself contains booleans, numbers, or defaults.
- Defaults should live in the schema or a small config layer, not scattered around service entrypoints.
- A generated documentation page or `.env.example` should come from metadata next to the schema, not from a hand-maintained table like this snapshot.
