# Megiddo

Megiddo is a TypeScript Turborepo that demonstrates clean service boundaries with a React frontend, API Gateway, Identity Service, Todo Service, public oRPC contracts, and platform seams.

## Local Development

Run the full local topology without Docker Compose:

```sh
pnpm dev:local
```

This starts real separate processes over localhost:

- Frontend: `http://localhost:5173`
- API Gateway: `http://localhost:3000`
- Todo Service: `http://localhost:3001`
- Identity Service: `http://localhost:3002`

`pnpm dev:local` generates one development Identity Token keypair and shares it with the service processes through environment variables. Identity signs tokens, while API and Todo verify those same tokens at their service boundaries.

Local service data is stored under `.data/local-dev` by default. Set `MEGIDDO_LOCAL_DATA_DIR` to use a different directory, which is useful for Sandcastle-style isolated workspaces.

Individual service scripts are available when you want separate terminals:

```sh
pnpm dev:identity
pnpm dev:todo
pnpm dev:api
pnpm dev:frontend
```

When running services manually, set the same `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64` and `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64` values for Identity, API, and Todo. Also point API at the backend services with `IDENTITY_SERVICE_URL` and `TODO_SERVICE_URL` if you are not using the default ports.

## Tests

Focused tests stay fast and do not require real backend services:

```sh
pnpm test
```

The localhost integration workflow starts real Identity, Todo, and API service processes and drives the authenticated frontend-facing todo path through the production Frontend API Adapter:

```sh
pnpm test:integration:local
```

Contract smoke tests are intentionally thin. They prove runtime routing, validation, auth/error mapping, and representative success paths instead of duplicating TypeScript type checks.
