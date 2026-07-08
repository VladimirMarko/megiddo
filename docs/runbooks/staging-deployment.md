# Staging Deployment Runbook

This runbook deploys Megiddo's production-shaped `staging` topology to Fly.io for PRD #56. The Services are deployed separately:

- Frontend: `megiddo-staging-frontend`, public at `https://megiddo-staging-frontend.fly.dev`
- API Gateway: `megiddo-staging-api`, public at `https://megiddo-staging-api.fly.dev`
- Identity: `megiddo-staging-identity`, private at `http://megiddo-staging-identity.internal:3002`
- Todo: `megiddo-staging-todo`, private at `http://megiddo-staging-todo.internal:3001`

## Responsibility Split

AFK-agent repo work:

- Keep `compose.yaml`, `deploy/containers/*`, and `deploy/fly/staging/*.fly.toml` checked in.
- Keep `pnpm containers:rehearse` and `pnpm secrets:deployment` passing.
- Update this runbook when deployment commands, app names, secrets, health checks, or known limitations change.

Operator steps:

- Run the local Compose rehearsal on a machine with Docker.
- Generate deployment secrets and transfer them to Fly secrets without committing them.
- Authenticate to Fly, select the correct organization, create apps, create volumes, set secrets, deploy, and verify staging.
- Run any command that requires Fly credentials or interactive confirmation.

## Prerequisites

- `pnpm install` has completed.
- Docker is installed for the local rehearsal.
- The Fly CLI is installed and available as `fly`.
- The operator has permission to create apps, volumes, and secrets in the target Fly organization.

## 1. Rehearse Locally

Run the mandatory local Compose deployment rehearsal before touching Fly:

```sh
pnpm containers:rehearse
```

The rehearsal builds the split container topology, starts Frontend, API Gateway, Identity, and Todo, waits for health checks, verifies public Frontend/API health over localhost, and verifies private Identity/Todo health through Compose internal networking.

Compose uses production-mode Identity defaults: Better Auth, JWT/JWS Identity Tokens, API-to-Identity internal auth, and mounted SQLite paths for Identity and Todo. If deployment secret environment variables are already exported, the rehearsal uses them. Otherwise it generates ephemeral rehearsal secrets and writes nothing to the repo.

## 2. Generate Deployment Secrets

Generate fresh staging secrets:

```sh
pnpm secrets:deployment
```

The command prints shell-style assignments for:

- `IDENTITY_INTERNAL_SERVICE_AUTH_SECRET`
- `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64`
- `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64`

Do not commit these values, paste them into documentation, or store them in `.env` files. Keep them in the operator's shell or password manager only long enough to set Fly secrets.

## 3. Authenticate And Create Fly Apps

Authenticate interactively:

```sh
fly auth login
```

Confirm the intended organization is available:

```sh
fly orgs list
```

Create the staging apps. Add `--org <org-slug>` if Fly does not infer the right organization:

```sh
fly apps create megiddo-staging-frontend
fly apps create megiddo-staging-api
fly apps create megiddo-staging-identity
fly apps create megiddo-staging-todo
```

These commands are operator steps because app creation can require account-specific choices and interactive Fly prompts.

## 4. Create Volumes

Identity and Todo are stateful single-instance Services for first staging. Create one durable volume for each private Service in the same primary region as the Fly manifests, currently `iad`:

```sh
fly volumes create megiddo_staging_identity_data --app megiddo-staging-identity --region iad --size 1
fly volumes create megiddo_staging_todo_data --app megiddo-staging-todo --region iad --size 1
```

The checked-in manifests mount those volumes at `/data`:

- Identity mounts `megiddo_staging_identity_data` at `/data` and stores `identity.sqlite` plus `better-auth.sqlite` there.
- Todo mounts `megiddo_staging_todo_data` at `/data` and stores `todo.sqlite` there.

Do not scale Identity or Todo above one Machine while they use service-owned SQLite volumes.

## 5. Set Fly Secrets

Set secrets from the values printed by `pnpm secrets:deployment`. Export those values in the operator shell, then pass variable references to `fly secrets set` as shown so secret values are not written to shell history.

```sh
fly secrets set --app megiddo-staging-api \
  IDENTITY_INTERNAL_SERVICE_AUTH_SECRET="$IDENTITY_INTERNAL_SERVICE_AUTH_SECRET"

fly secrets set --app megiddo-staging-identity \
  IDENTITY_INTERNAL_SERVICE_AUTH_SECRET="$IDENTITY_INTERNAL_SERVICE_AUTH_SECRET" \
  MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64" \
  MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64"

fly secrets set --app megiddo-staging-todo \
  MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64"
```

Frontend has no secret values. Its public API Gateway URL is a build argument in `deploy/fly/staging/frontend.fly.toml`.

## 6. Deploy Services

Deploy private Services first, then API Gateway, then Frontend:

```sh
fly deploy --config deploy/fly/staging/identity.fly.toml
fly deploy --config deploy/fly/staging/todo.fly.toml
fly deploy --config deploy/fly/staging/api.fly.toml
fly deploy --config deploy/fly/staging/frontend.fly.toml
```

The manifests define canonical app names, runtime env, health checks, public ingress for Frontend/API, and no public ingress for Identity/Todo.

## 7. Verify Deployment

Verify public health endpoints from the operator machine:

```sh
curl --fail https://megiddo-staging-frontend.fly.dev/health
curl --fail https://megiddo-staging-api.fly.dev/health
```

Verify private Service health from inside the Fly private network through the API app:

```sh
fly ssh console --app megiddo-staging-api -C "node -e \"fetch('http://megiddo-staging-identity.internal:3002/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\""
fly ssh console --app megiddo-staging-api -C "node -e \"fetch('http://megiddo-staging-todo.internal:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\""
```

Check platform logs if a deploy or health check fails:

```sh
fly logs --app megiddo-staging-frontend
fly logs --app megiddo-staging-api
fly logs --app megiddo-staging-identity
fly logs --app megiddo-staging-todo
```

## Known Limitations

- The temporary Fly provider choice is intentional. Provider-specific configuration stays in deployment files and runtime values, not application code.
- Identity and Todo are single-instance stateful Services while they use service-owned SQLite volumes.
- There are no backups for first staging. Treat staging data as disposable except for basic process restarts.
- There are no migrations. Startup-time SQLite initialization is the only first-staging schema lifecycle.
- Observability is basic observability only: Fly logs and HTTP health checks. Hosted telemetry is deferred.
- There is no CI/CD for first staging. Deployment is manual through this runbook.
- There are no custom domains. Staging uses Fly default `.fly.dev` URLs.
