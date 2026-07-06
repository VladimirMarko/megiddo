# Identity Service Current State

Date: 2026-07-06
Commit: `9875c65dcfc04ce7305cba7f0e3152de27a94e99`

## Summary

The `identity` service currently provides a development identity-token issuer and a health endpoint. It is not just a placeholder: it signs compact Ed25519 tokens and the API Gateway/Todo service verify and exchange those tokens at service boundaries. However, it is explicitly development-grade. Any caller can ask Identity to mint a token for any subject and any audience, users are auto-created by subject string, and tokens lack production controls such as expiry, issuer, key identifiers, rotation, revocation, and public key discovery.

The current implementation proves the architecture shape: Identity issues asymmetric user tokens, API Gateway exchanges browser-facing tokens for service-specific tokens, and services verify tokens at their own boundary. It does not yet prove real authentication, authorization, production key management, or durable session security.

## Where It Lives

- Service package: `apps/identity`
- App factory: `apps/identity/src/app.ts`
- Server entrypoint: `apps/identity/src/server.ts`
- oRPC router: `apps/identity/src/router.ts`
- Use-case seam: `apps/identity/src/identity-use-cases.ts`
- Development SQLite auth adapter: `apps/identity/src/embedded-development-auth-provider-adapter.ts`
- Token signer/verifier implementation: `packages/platform/src/index.ts`
- Contract schemas and routes: `packages/contracts/src/index.ts`

## Public Runtime Behavior

Identity exposes two things:

- `GET /health`, returning `{ service: 'identity', message: 'identity service is running' }`.
- oRPC under `/rpc`.

The identity oRPC contract currently has:

- `v1.development.identityTokens.issue`
- `v1.operational.health`

`v1.development.identityTokens.issue` accepts:

```ts
{
  subject?: string
  audience: { service: string }
  contractVersion?: string
}
```

It returns:

```ts
{
  identityToken: string
  user: { id: string }
}
```

The default subject is `dev:viewer`.

## What Token Issuance Actually Does

The issuance path is small:

1. `apps/identity/src/router.ts` routes `v1.development.identityTokens.issue` to `identity.issueDevelopmentIdentityToken(input)`.
2. `apps/identity/src/identity-use-cases.ts` resolves a development user from the requested subject.
3. It calls `tokenSigner.issueIdentityToken` with the resolved user id as `subject`, plus the requested `audience` and optional `contractVersion`.
4. It returns the signed token and `{ id: subject }`.

There is no check that the caller is allowed to mint a token for that subject. There is also no check that the caller is allowed to mint for the requested audience.

## Storage Model

The embedded Identity adapter stores only development users:

```sql
CREATE TABLE IF NOT EXISTS development_users (
  id TEXT PRIMARY KEY
);
```

Resolution behavior:

- Look up `development_users.id` by the requested subject.
- If it exists, return it.
- If it does not exist, insert it and return it.

Runtime database path:

- Default: `.data/identity/identity.sqlite`
- Override: `IDENTITY_DATABASE_PATH`

There are no account records, credentials, external IdP identities, sessions, refresh tokens, grants, roles, permissions, consent records, signing keys, revocation rows, or audit records.

## Cryptography And Token Format

The crypto code lives in `packages/platform/src/index.ts`.

Current token shape:

```txt
base64url(header).base64url(payload).base64url(signature)
```

Header:

```json
{ "alg": "EdDSA", "typ": "megiddo.identity-token.v1" }
```

Claims:

```ts
{
  subject: string
  audience: { service: string }
  contractVersion?: string
  issuedAt: number
}
```

Signing behavior:

- Uses Node `crypto` Ed25519 via `generateKeyPairSync('ed25519')` and `sign(null, ...)`.
- Signs `base64url(header) + '.' + base64url(payload)`.
- Exports/reads keys as PEM.

Key configuration:

- `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64`
- `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64`

If those env vars are absent, each codec instance generates an in-memory development keypair. The local dev runner generates one keypair and shares it across service processes so Gateway and Todo can verify Identity-issued tokens during `pnpm dev`.

Verification behavior:

- Requires exactly three compact token segments.
- Verifies the Ed25519 signature with the public key.
- Parses the payload JSON.
- Checks only `claims.audience.service === expected.service`.
- Returns the claims.

The verifier does not validate the decoded header. It does not validate expiry, issuer, key id, token type, not-before, or clock skew.

## How Other Services Use It

API Gateway uses Identity in two places:

- Development sign-in calls Identity for an `api-gateway` audience token and returns it to the frontend.
- When calling Todo, Gateway verifies the browser token for `api-gateway`, then asks Identity to issue a fresh `todo` audience token for the same subject.

Todo uses Identity tokens at its boundary:

- It verifies the incoming token for audience `todo`.
- It uses `claims.subject` as the todo `ownerId`.
- Todo records are scoped by `owner_id`.

Frontend behavior:

- Stores the returned identity token in memory.
- Sends it to API Gateway as `Authorization: Bearer <token>`.
- Clears the in-memory token on sign-out or expired state.

## Fake Login And Development Token Switches

The fake login UI is not behind a feature flag today. It is the current product path.

Frontend behavior:

- `apps/frontend/src/todo-app.tsx` calls `api.signInDevelopment()` when the user clicks "Sign in".
- `apps/frontend/src/api/frontend-api-adapter.ts` exposes `signInDevelopment` on the frontend API seam.
- That adapter calls API Gateway's `v1.viewer.session.signInDevelopment` procedure.

API Gateway behavior:

- `apps/api/src/router.ts` implements `v1.viewer.session.signInDevelopment`.
- The handler calls `identityClient.issueDevelopmentIdentityToken` with audience `api-gateway`.
- Gateway returns a logged-in session containing the issued `identityToken`.

Identity behavior:

- `apps/identity/src/router.ts` exposes `v1.development.identityTokens.issue`.
- `apps/identity/src/identity-use-cases.ts` resolves or creates a development user and signs a token.

There is no environment variable, build mode, runtime config, or feature flag that selects between fake login and real login. The only login path exposed to the frontend is the development sign-in path.

Development token compatibility is governed by key sharing, not by a fake/real switch.

- Identity defaults to `createDevelopmentIdentityTokenCodec()` as token signer in `apps/identity/src/app.ts`.
- API Gateway defaults to `createDevelopmentIdentityTokenCodec()` as token verifier in `apps/api/src/app.ts`.
- Todo defaults to `createDevelopmentIdentityTokenCodec()` as token verifier in `apps/todo/src/app.ts`.
- `scripts/run-local-dev.mts` generates one development keypair and injects it into every service process.
- The env vars are `MEGIDDO_IDENTITY_TOKEN_PRIVATE_KEY_PEM_BASE64` and `MEGIDDO_IDENTITY_TOKEN_PUBLIC_KEY_PEM_BASE64`.

If services share those env vars, Identity-issued development tokens verify across API Gateway and Todo. If the vars are missing, each codec instance can generate its own in-memory keypair, which means separately-started services may not trust each other's tokens.

The intended workflow is documented in `docs/adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md`: `pnpm dev` is the supported full local topology because it starts Identity, Todo, API Gateway, and Frontend with one shared development Identity Token keypair. `pnpm dev:turbo` does not do that unless the caller manually supplies matching token key environment variables and service URLs.

## Existing Tests And Docs

Tests cover the architecture shape:

- Identity/Todo token verification and wrong-audience rejection: `tests/identity-tokens.test.ts`
- API Gateway integration with Identity and Todo: `tests/api-gateway.test.ts`
- Embedded identity persistence: `tests/embedded-persistence-adapters.test.ts`
- Operational health: `tests/operational-health.test.ts`
- oRPC telemetry across services: `tests/orpc-telemetry.test.ts`

Relevant ADRs:

- `docs/adr/0003-identity-issues-asymmetric-user-tokens.md`
- `docs/adr/0012-services-verify-identity-tokens-at-their-boundary.md`
- `docs/adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md`

## Production Gaps

These are the major gaps if Identity is meant to work as a real service rather than a development fixture.

- No real authentication. A caller can request a token for any `subject`.
- No authorization around token issuance. A caller can request any `audience.service`.
- The public procedure is named under `development`, and the auth adapter is development-specific.
- Users are auto-created from arbitrary subject strings.
- No credentials, OIDC provider integration, passwordless flow, or external identity mapping.
- No durable session model.
- No refresh-token model.
- No token expiry, `exp`, `nbf`, max age, or clock-skew handling.
- No issuer claim or issuer validation.
- No key id, key registry, key rotation, or key retirement.
- No JWKS/public-key discovery endpoint.
- No revocation or sign-out invalidation. Gateway sign-out only clears client state.
- No audit log of token issuance or authentication events.
- No rate limiting or abuse controls around token minting.
- No token introspection endpoint.
- Token format is custom JWS-like compact data, not a standard JWT/JWS implementation.
- Verification does not validate header `alg` or `typ`.
- Production key management is env-var PEM only; there is no KMS/HSM/secret-store integration.

## Current Reality In One Sentence

Identity currently acts as a development-only Ed25519 token mint plus auto-creating subject registry; it validates the intended service-boundary architecture, but it does not yet implement real user authentication, production token lifecycle, or cryptographic operations management.

## Grill-With-Docs Starting Points

Use these as the first questions for the design session:

1. What does “advertiles” mean here in concrete Identity terms: user login, service-to-service auth, signed ad inventory claims, audience tokens, or all of these?
2. Should Identity be an identity provider, a token service, or a facade over an external IdP?
3. Which principals exist: human users, services, advertisers, publishers, devices, campaigns, or tenants?
4. Which tokens do we need: access tokens, refresh tokens, ID tokens, service tokens, signed capability tokens, or ad-verification tokens?
5. Which claims must downstream services be able to trust without calling Identity?
6. What should token audiences be: service names, API resources, tenants, ad placements, or narrower capabilities?
7. How should keys be generated, stored, rotated, published, and retired?
8. What is the sign-out/revocation story?
9. Which flows must be local-dev only, and which must be production paths from the start?
10. What are the first tracer-bullet slices that make Identity materially real without overbuilding it?
