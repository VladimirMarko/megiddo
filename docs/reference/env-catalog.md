# Env Catalog

Generated from env metadata adjacent to service, script, frontend, and platform env owners. This file is documentation/check tooling only; services must keep validating their own runtime env through owned Env Contracts.

| Variable | Owner | Surface | Allowed values | Default | Description |
| --- | --- | --- | --- | --- | --- |
| `PORT` | Frontend | frontend | TCP port string | 5173 in pnpm dev topology | Vite development server port passed by the local dev topology. |
| `UI_DUMMY_AUTH_LOGIN_SHORTCUT` | Frontend | frontend | enabled | disabled | Legacy unprefixed shortcut flag from the inventory snapshot; Vite does not expose it to browser code by default. |
| `VITE_UI_DUMMY_AUTH_LOGIN_SHORTCUT` | Frontend | frontend | enabled | disabled | Vite-exposed shortcut flag that enables dummy auth login helpers in the browser UI. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Platform Local Telemetry | platform | URL | http://localhost:4318 in pnpm dev topology | OTLP HTTP endpoint injected for local service telemetry. |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Platform Local Telemetry | platform | http/protobuf for local telemetry | http/protobuf in pnpm dev topology | OTLP exporter protocol injected for local service telemetry. |
| `OTEL_SERVICE_NAME` | Platform Local Telemetry | platform | service name string | megiddo-service when unset by local telemetry setup; service-specific in pnpm dev | OpenTelemetry service.name value used by local telemetry setup. |
| `OTEL_TRACES_EXPORTER` | Platform Local Telemetry | platform | otlp enables local telemetry setup | unset disables Megiddo local telemetry setup | Switch used by platform local telemetry setup to opt into OTLP tracing. |
| `API_PORT` | Local Dev Script | script | TCP port string | 3000 | Port injected into API Gateway as PORT by pnpm dev. |
| `FRONTEND_PORT` | Local Dev Script | script | TCP port string | 5173 | Port passed to Vite and injected into frontend as PORT by pnpm dev. |
| `IDENTITY_PORT` | Local Dev Script | script | TCP port string | 3002 | Port injected into Identity as PORT by pnpm dev. |
| `MEGIDDO_LOCAL_DATA_DIR` | Local Dev Script | script | non-empty filesystem path | .data/local-dev under workspace root | Base directory used by local dev and reset scripts for embedded service data. |
| `TODO_PORT` | Local Dev Script | script | TCP port string | 3001 | Port injected into Todo as PORT by pnpm dev. |
| `OTEL_GUI_BIN` | Telemetry Viewer Script | script | executable path or command name | otel-gui | Telemetry viewer binary invoked by pnpm telemetry:viewer. |
| `OTEL_GUI_PORT` | Telemetry Viewer Script | script | TCP port string | 4318 unless PORT is set | Viewer ingest port fallback used by pnpm telemetry:viewer. |
| `PORT` | Telemetry Viewer Script | script | TCP port string | 4318 for viewer when OTEL_GUI_PORT is unset | Telemetry viewer ingest port; takes precedence over OTEL_GUI_PORT. |
| `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | API Gateway | service | non-empty string | platform default internal-service secret | Secret sent to Identity for internal service-token issuance calls; must match Identity. |
| `IDENTITY_SERVICE_URL` | API Gateway | service | URL | http://localhost:3002 | Base URL used by API Gateway to call Identity. |
| `PORT` | API Gateway | service | TCP port string | 3000 | API Gateway listen port. |
| `TODO_SERVICE_URL` | API Gateway | service | URL | http://localhost:3001 | Base URL used by API Gateway to call Todo. |
| `BETTER_AUTH_URL` | Identity Service | service | string | unset | Preferred public base URL for embedded Better Auth. |
| `IDENTITY_AUTH_PROVIDER` | Identity Service | service | dummy, better-auth | dummy after config derivation | Selects the Identity auth provider; dummy is rejected in production. |
| `IDENTITY_BETTER_AUTH_BASE_URL` | Identity Service | service | string | unset | Service-specific fallback base URL for embedded Better Auth. |
| `IDENTITY_BETTER_AUTH_DATABASE_PATH` | Identity Service | service | non-empty filesystem path | .data/identity/better-auth.sqlite | SQLite database path for the embedded Better Auth provider. |
| `IDENTITY_DATABASE_PATH` | Identity Service | service | non-empty filesystem path | .data/identity/identity.sqlite | SQLite database path for the embedded dummy Identity provider. |
| `IDENTITY_DUMMY_AUTH_DEMO_ACCOUNTS` | Identity Service | service | enabled | disabled unless local-dummy profile is active | Seeds Alice and Bob demo accounts for dummy auth. |
| `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET` | Identity Service | service | non-empty string | platform default internal-service secret | Secret expected from API Gateway for internal service-token issuance calls. |
| `IDENTITY_TOKEN_CODEC` | Identity Service | service | dummy, jwt-jws | dummy after config derivation | Selects Identity token signing mode; dummy is rejected in production. |
| `MEGIDDO_AUTH_PROFILE` | Identity Service | service | local-dummy | unset | Local convenience profile that expands to dummy Identity defaults. |
| `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64` | Identity Service | service | base64url-encoded PEM private key | unset; required for JWT/JWS signing without an explicit key option | Private key consumed by the platform JWT/JWS Identity token signer. |
| `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | Identity Service | service | base64url-encoded PEM public key | unset; required for JWT/JWS verification without an explicit key option | Public key consumed by platform JWT/JWS Identity token verification. |
| `NODE_ENV` | Identity Service | service | development, test, production | runtime or tooling defined | Used by Identity config derivation to reject dummy modes in production. |
| `PORT` | Identity Service | service | TCP port string | 3002 | Identity listen port. |
| `IDENTITY_TOKEN_CODEC` | Todo Service | service | dummy, jwt-jws | jwt-jws after config derivation unless local-dummy selects dummy | Selects the Identity token verifier mode used by Todo. |
| `MEGIDDO_AUTH_PROFILE` | Todo Service | service | local-dummy | unset | Local convenience profile that selects dummy token verification when the codec is unset. |
| `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` | Todo Service | service | base64url-encoded PEM public key | unset; required for JWT/JWS verification without an explicit key option | Public key consumed by platform JWT/JWS Identity token verification. |
| `PORT` | Todo Service | service | TCP port string | 3001 | Todo listen port. |
| `TODO_DATABASE_PATH` | Todo Service | service | non-empty filesystem path | .data/todo/todo.sqlite | SQLite database path for Todo persistence. |
