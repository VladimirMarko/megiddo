# First Live Fly Deploy Operator Handoff

This checklist is the operator handoff for PRD #56 and Issue #64. It records what the human operator ran, what Fly resources were created, what evidence proved the first live staging deployment, and which conditions require stopping to revisit the deployment design.

Completing this checklist requires Fly credentials and may trigger interactive Fly prompts. Do not ask an AFK agent to run these commands or paste secrets into this document.

## Canonical Topology

- Frontend app: `megiddo-staging-frontend`, public URL `https://megiddo-staging-frontend.fly.dev`
- API Gateway app: `megiddo-staging-api`, public URL `https://megiddo-staging-api.fly.dev`
- Identity app: `megiddo-staging-identity`, private service URL `http://megiddo-staging-identity.internal:3002`
- Todo app: `megiddo-staging-todo`, private service URL `http://megiddo-staging-todo.internal:3001`

## Operator And Environment

- Operator name:
- Date:
- Fly organization:
- Fly primary region: `iad`
- Repository commit deployed:
- Local machine has Docker installed:
- Fly CLI version:

## Interactive Or Credentialed Steps

Record completion, timestamps, and notes for each step that requires operator credentials, local Docker, generated secrets, Fly account access, or interactive confirmation.

| Step | Command | Timestamp | Evidence or notes |
| --- | --- | --- | --- |
| Authenticate to Fly | `fly auth login` |  |  |
| Confirm target organization | `fly orgs list` |  |  |
| Run mandatory Compose rehearsal | `pnpm containers:rehearse` |  |  |
| Generate deployment secrets | `pnpm secrets:deployment` |  | Record only that fresh secrets were generated. Do not paste values. |
| Create Frontend app | `fly apps create megiddo-staging-frontend` |  |  |
| Create API Gateway app | `fly apps create megiddo-staging-api` |  |  |
| Create Identity app | `fly apps create megiddo-staging-identity` |  |  |
| Create Todo app | `fly apps create megiddo-staging-todo` |  |  |
| Create Identity volume | `fly volumes create megiddo_staging_identity_data --app megiddo-staging-identity --region iad --size 1` |  |  |
| Create Todo volume | `fly volumes create megiddo_staging_todo_data --app megiddo-staging-todo --region iad --size 1` |  |  |
| Set API Gateway secrets | `fly secrets set --app megiddo-staging-api IDENTITY_INTERNAL_SERVICE_AUTH_SECRET="$IDENTITY_INTERNAL_SERVICE_AUTH_SECRET"` |  |  |
| Set Identity secrets | `fly secrets set --app megiddo-staging-identity BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" IDENTITY_INTERNAL_SERVICE_AUTH_SECRET="$IDENTITY_INTERNAL_SERVICE_AUTH_SECRET" MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64" MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64"` |  |  |
| Set Todo secrets | `fly secrets set --app megiddo-staging-todo MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64="$MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64"` |  |  |
| Deploy Identity | `fly deploy --config deploy/fly/staging/identity.fly.toml` |  |  |
| Deploy Todo | `fly deploy --config deploy/fly/staging/todo.fly.toml` |  |  |
| Deploy API Gateway | `fly deploy --config deploy/fly/staging/api.fly.toml` |  |  |
| Deploy Frontend | `fly deploy --config deploy/fly/staging/frontend.fly.toml` |  |  |
| Inspect logs if needed | `fly logs --app <app-name>` |  |  |

## Resource Record

Record Fly app IDs/names, volume names, deployed versions, and verification timestamps here.

| Service | Fly app IDs/names | Volume names | Deployed versions | Verification timestamps |
| --- | --- | --- | --- | --- |
| Frontend | `megiddo-staging-frontend` | none |  |  |
| API Gateway | `megiddo-staging-api` | none |  |  |
| Identity | `megiddo-staging-identity` | `megiddo_staging_identity_data` |  |  |
| Todo | `megiddo-staging-todo` | `megiddo_staging_todo_data` |  |  |

## Verification Evidence

Capture command output, HTTP status, response body summary, timestamp, and any relevant Fly machine or release identifier. Do not paste secrets.

| Verification | Command | Expected result | Evidence |
| --- | --- | --- | --- |
| Frontend evidence | `curl --fail https://megiddo-staging-frontend.fly.dev/health` | Public Frontend health responds successfully. |  |
| API Gateway evidence | `curl --fail https://megiddo-staging-api.fly.dev/health` | Public API Gateway health responds successfully. |  |
| Identity evidence | `fly ssh console --app megiddo-staging-api -C "node -e \"fetch('http://megiddo-staging-identity.internal:3002/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\""` | Private Identity health is reachable from API Gateway over Fly private networking. |  |
| Todo evidence | `fly ssh console --app megiddo-staging-api -C "node -e \"fetch('http://megiddo-staging-todo.internal:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\""` | Private Todo health is reachable from API Gateway over Fly private networking. |  |
| API Gateway-to-Identity connectivity evidence | `fly ssh console --app megiddo-staging-api` with the Identity private health fetch above | API Gateway can resolve and reach `http://megiddo-staging-identity.internal:3002`. |  |
| API Gateway-to-Todo connectivity evidence | `fly ssh console --app megiddo-staging-api` with the Todo private health fetch above | API Gateway can resolve and reach `http://megiddo-staging-todo.internal:3001`. |  |

## Stop and Revisit Conditions

Stop the deployment and revisit the deployment design before proceeding if any of these occur:

- Better Auth browser flows require Identity to be public or require direct browser callback routes to `megiddo-staging-identity`.
- API Gateway cannot reach Identity through `http://megiddo-staging-identity.internal:3002`.
- API Gateway cannot reach Todo through `http://megiddo-staging-todo.internal:3001`.
- Identity or Todo must be scaled above one Machine while still using service-owned SQLite volumes.
- Fly volumes cannot be created or mounted in the configured primary region.
- Staging requires custom domains, CI/CD, backups, migrations, or hosted telemetry before the first live deployment can be verified.
- The Frontend must hardcode a non-canonical API Gateway URL instead of using `https://megiddo-staging-api.fly.dev` through its env contract.
- Dummy auth, dummy token codecs, or dummy frontend auth shortcuts are needed for staging to pass verification.

## Completion Notes

- Deployment completed by:
- Completion timestamp:
- Follow-up issues opened:
- Design questions discovered:
