# Env Catalog

Generated from env metadata adjacent to service, script, frontend, and platform env owners. This file is documentation/check tooling only; services must keep validating their own runtime env through owned Env Contracts.

| Owner | Variable | Surface | Allowed values | Default | Description |
| --- | --- | --- | --- | --- | --- |
| Frontend | `PORT` | frontend | TCP port string | 5173 in pnpm dev topology | Vite development server port passed by the local dev topology. |
| Frontend | `UI_DUMMY_AUTH_LOGIN_SHORTCUT` | frontend | enabled | disabled | Legacy unprefixed shortcut flag from the inventory snapshot; Vite does not expose it to browser code by default. |
| Frontend | `VITE_API_GATEWAY_BASE_URL` | frontend | URL | http://localhost:3000 | Vite-exposed browser-safe base URL used by the frontend API adapter to call the API Gateway. |
| Frontend | `VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT` | frontend | enabled | disabled | Vite-exposed shortcut flag that enables dummy auth login helpers in the browser UI. |
| Platform Local Telemetry | `OTEL_EXPORTER_OTLP_ENDPOINT` | platform | URL | http://localhost:4318 in pnpm dev topology | OTLP HTTP endpoint injected for local service telemetry. |
| Platform Local Telemetry | `OTEL_EXPORTER_OTLP_PROTOCOL` | platform | http/protobuf for local telemetry | http/protobuf in pnpm dev topology | OTLP exporter protocol injected for local service telemetry. |
| Platform Local Telemetry | `OTEL_SERVICE_NAME` | platform | service name string | megiddo-service when unset by local telemetry setup; service-specific in pnpm dev | OpenTelemetry service.name value used by local telemetry setup. |
| Platform Local Telemetry | `OTEL_TRACES_EXPORTER` | platform | otlp enables local telemetry setup | unset disables Megiddo local telemetry setup | Switch used by platform local telemetry setup to opt into OTLP tracing. |
| Local Dev Script | `API_PORT` | script | TCP port string | 3000 | Port injected into API Gateway as PORT by pnpm dev. |
| Local Dev Script | `FRONTEND_PORT` | script | TCP port string | 5173 | Port passed to Vite and injected into frontend as PORT by pnpm dev. |
| Local Dev Script | `IDENTITY_PORT` | script | TCP port string | 3002 | Port injected into Identity as PORT by pnpm dev. |
| Local Dev Script | `MEGIDDO_LOCAL_DATA_DIR` | script | non-empty filesystem path | .data/local-dev under workspace root | Base directory used by local dev and reset scripts for embedded service data. |
| Local Dev Script | `TODO_PORT` | script | TCP port string | 3001 | Port injected into Todo as PORT by pnpm dev. |
| Telemetry Viewer Script | `OTEL_GUI_BIN` | script | executable path or command name | otel-gui | Telemetry viewer binary invoked by pnpm telemetry:viewer. |
| Telemetry Viewer Script | `OTEL_GUI_PORT` | script | TCP port string | 4318 unless PORT is set | Viewer ingest port fallback used by pnpm telemetry:viewer. |
| Telemetry Viewer Script | `PORT` | script | TCP port string | 4318 for viewer when OTEL_GUI_PORT is unset | Telemetry viewer ingest port; takes precedence over OTEL_GUI_PORT. |
| API Gateway | `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | service | non-empty string | platform default internal-service secret | Secret sent to Identity for internal service-token issuance calls; must match Identity. |
| API Gateway | `IDENTITY_SERVICE_URL` | service | URL | http://localhost:3002 | Base URL used by API Gateway to call Identity. |
| API Gateway | `PORT` | service | TCP port string | 3000 | API Gateway listen port. |
| API Gateway | `TODO_SERVICE_URL` | service | URL | http://localhost:3001 | Base URL used by API Gateway to call Todo. |
| Identity Service | `BETTER_AUTH_URL` | service | string | unset | Preferred public base URL for embedded Better Auth. |
| Identity Service | `IDENTITY_AUTH_PROVIDER` | service | dummy, better-auth | dummy after config derivation | Selects the Identity auth provider; dummy is rejected in production. |
| Identity Service | `IDENTITY_BETTER_AUTH_BASE_URL` | service | string | unset | Service-specific fallback base URL for embedded Better Auth. |
| Identity Service | `IDENTITY_BETTER_AUTH_DATABASE_PATH` | service | non-empty filesystem path | .data/identity/better-auth.sqlite | SQLite database path for the embedded Better Auth provider. |
| Identity Service | `IDENTITY_DATABASE_PATH` | service | non-empty filesystem path | .data/identity/identity.sqlite | SQLite database path for the embedded dummy Identity provider. |
| Identity Service | `IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS` | service | enabled | disabled unless local-dummy profile is active | Seeds Alice and Bob demo accounts for dummy auth. |
| Identity Service | `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | service | non-empty string | platform default internal-service secret | Secret expected from API Gateway for internal service-token issuance calls. |
| Identity Service | `IDENTITY_TOKEN_CODEC` | service | dummy, jwt-jws | dummy after config derivation | Selects Identity token signing mode; dummy is rejected in production. |
| Identity Service | `MEGIDDO_AUTH_PROFILE` | service | local-dummy | unset | Local convenience profile that expands to dummy Identity defaults. |
| Identity Service | `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64` | service | base64url-encoded PEM private key | unset; required for JWT/JWS signing without an explicit key option | Private key consumed by the platform JWT/JWS Identity token signer. |
| Identity Service | `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | service | base64url-encoded PEM public key | unset; required for JWT/JWS verification without an explicit key option | Public key consumed by platform JWT/JWS Identity token verification. |
| Identity Service | `NODE_ENV` | service | development, test, production | runtime or tooling defined | Used by Identity config derivation to reject dummy modes in production. |
| Identity Service | `PORT` | service | TCP port string | 3002 | Identity listen port. |
| Todo Service | `IDENTITY_TOKEN_CODEC` | service | dummy, jwt-jws | jwt-jws after config derivation unless local-dummy selects dummy | Selects the Identity token verifier mode used by Todo. |
| Todo Service | `MEGIDDO_AUTH_PROFILE` | service | local-dummy | unset | Local convenience profile that selects dummy token verification when the codec is unset. |
| Todo Service | `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | service | base64url-encoded PEM public key | unset; required for JWT/JWS verification without an explicit key option | Public key consumed by platform JWT/JWS Identity token verification. |
| Todo Service | `PORT` | service | TCP port string | 3001 | Todo listen port. |
| Todo Service | `TODO_DATABASE_PATH` | service | non-empty filesystem path | .data/todo/todo.sqlite | SQLite database path for Todo persistence. |
