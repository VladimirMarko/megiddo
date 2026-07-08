# Development History And Architecture Rationale

Last updated: 2026-07-08.

This document is the primary development-history and architecture-rationale guide for Megiddo. It explains the current architecture by tying each major claim back to existing ADRs, reports, README sections, generated docs, repository vocabulary, or issue clusters. It is not a complete implementation walkthrough.

## Purpose

This document is a narrative index and explanatory guide across Megiddo's development history and architecture decisions. It explains how the project moved from a thin end-to-end tracer bullet toward its current shape: a React frontend, API Gateway, Identity Service, Todo Service, published oRPC contracts, and platform seams.

It is not a replacement for ADRs. ADRs remain the source of record for individual decisions. When this guide summarizes an architectural choice, readers should be able to follow the link to the relevant ADR, report, README section, catalog, or issue cluster for the evidence behind the claim.

This guide should stay at architecture-narrative level. It should avoid stale code-level walkthroughs and should point to canonical operational docs, especially the [`README`](../../README.md#local-development), when a reader needs current commands or local workflow details.

## Canonical Source Rules

- Treat [`docs/adr/`](../adr/) as canonical for individual architecture decisions.
- Treat the [`Architecture History Source Inventory`](architecture-history-source-inventory.md) as the current map of supported sources, transitional material, and cautions for this narrative work.
- Treat the [`README`](../../README.md#local-development) as canonical for current local-development commands, topology ports, and env-loading policy.
- Treat the [`README`](../../README.md#tests) as canonical for current test commands and testing workflow.
- Treat the README [`Local Telemetry Viewer`](../../README.md#local-telemetry-viewer) section as canonical for the selected local viewer workflow.
- Treat [`CONTEXT.md`](../../CONTEXT.md) as the vocabulary source for project terms such as Service, API Gateway, Frontend API Adapter, Identity Token, Token Codec, Env Contract, and Best-Effort Telemetry Export.
- Treat the generated [`Env Catalog`](env-catalog.md) as the current human-facing environment-variable inventory, not as a runtime configuration surface.
- Treat reports under [`docs/reports/`](../reports/) as supporting evidence or historical snapshots. If a report preserves an older baseline, describe it as transitional rather than current architecture.
- Treat issue history as chronology and slice context. Prefer ADRs over issues when both exist for the same architectural claim.
- If rationale is inferred from supported sources rather than explicitly stated, say so plainly.

## Development History

The development history uses supported source ordering, not a commit-by-commit reconstruction. The stable timeline spine is ADR numbering, report dates, issue clusters, and PRD ordering. Commit history can support a narrow point, but this document should not try to rebuild every implementation step from commits.

### Timeline Shape

| Sequence | Decision cluster | Supported source ordering | Narrative role |
| --- | --- | --- | --- |
| 1 | Original topology and tracer bullet | Issues #1 through #10; ADR-0001 through ADR-0018 | Establishes the TypeScript Turborepo, first published contracts, API Gateway, Todo Service, Identity Service, frontend path, embedded persistence direction, and the thin vertical tracer-bullet strategy. |
| 2 | Frontend and local workflow seam hardening | Issues #11 through #17; ADR-0006, ADR-0011, ADR-0014, ADR-0017 | Hardens the Frontend API Adapter seam, UI failure handling, focused tests, and local integration workflow. |
| 3 | Local telemetry and viewer selection | Issues #19 through #26; ADR-0021 through ADR-0023; [`2026-07-05 local viewer report`](../reports/2026-07-05-local-opentelemetry-viewers.md) | Adds service spans, best-effort local telemetry export, and evaluation of existing viewers before building custom devtools. |
| 4 | Identity modes and auth boundaries | Issues #27 through #35; ADR-0010, ADR-0012, ADR-0019, ADR-0024; [`2026-07-06 identity report`](../reports/2026-07-06-identity-service-current-state.md) | Separates dummy auth, Better Auth, token codecs, browser sessions, and service-boundary token verification. |
| 5 | Environment architecture | Issues #37 through #48; ADR-0025; [`2026-07-06 environment report`](../reports/2026-07-06-environment-variables.md); [`Env Catalog`](env-catalog.md) | Moves env handling toward owned Env Contracts, derived Config objects, explicit runtime env inputs, and generated documentation. |
| 6 | Development-history documentation | Issues #49 through #54; [`Architecture History Source Inventory`](architecture-history-source-inventory.md) | Builds this guide in slices: source inventory, skeleton, theme narrative, topology and boundary rationale, and validation. |
| 7 | Production-shaped staging deployment | Issues #56 through #64; ADR-0026 through ADR-0032; [`Staging Deployment Runbook`](../runbooks/staging-deployment.md); [`First Live Fly Deploy Handoff`](../runbooks/first-live-fly-deploy-handoff.md) | Preserves the split Service topology in a first cloud deployment shape on Fly, with mandatory Compose rehearsal, production-mode Identity, service-owned SQLite volumes, health checks, and explicit first-staging limitations. |

## Architecture Themes

These themes summarize Megiddo's current high-level shape and the rationale that existing sources support. Each section keeps ADRs as the canonical decisions and uses reports, README material, the Env Catalog, and issue clusters as supporting evidence or historical context.

### Tracer-Bullet Strategy

Megiddo starts by proving a thin end-to-end path through the frontend, API Gateway, Identity Service, Todo Service, contracts, and platform seams before deepening internals. [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md) records this explicitly: the first slice should exercise the frontend API adapter, gateway, service contracts, identity token seam, and Todo use cases before adding deeper persistence, Better Auth, production token cryptography, or complete contract-versioning behavior.

That choice shaped the initial topology. The project was not built as isolated packages that would later be wired together; it was built as thin but separately named parts of the final system so the first useful behavior crossed the same boundaries the architecture intended to keep. [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) narrows the first persistence choice to in-memory repositories behind adapters, and the [`Architecture History Source Inventory`](architecture-history-source-inventory.md) marks that as historical for the first slice rather than current local-development persistence.

The supported rationale is that early end-to-end pressure exposes boundary mistakes sooner than deepening one service in isolation. The inferred rationale is that this made the API Gateway, Frontend API Adapter, service-token seam, and contracts package hard to bypass because each one had to carry real behavior from the beginning. That inference is consistent with [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md), but the ADR does not state it as a separate principle.

### Service Boundaries And API Gateway

The frontend talks to the API Gateway rather than directly to the Identity Service or Todo Service. [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md) gives the direct rationale: the gateway exposes the collated oRPC API surface, composes calls to backend services, and provides a clear place for session handling, inter-service communication, and frontend-focused test doubles.

This boundary also keeps browser auth from becoming service-specific browser integration. [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md) says browser-facing auth flows go through the gateway so the frontend has one backend boundary, with explicit exceptions only when an auth callback cannot reasonably be handled there. [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) continues that direction: the normal browser path talks only to the API Gateway, while the gateway forwards browser session context to Identity and asks Identity for downstream service tokens server-side.

The topology is still made of separately runnable services, not a monolithic backend hidden behind the gateway. [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md) and the [`README`](../../README.md#local-development) both describe the local topology as real separate processes for Frontend, API Gateway, Todo Service, and Identity Service over localhost. [`ADR-0016`](../adr/0016-use-hono-for-service-http-runtime.md) supports the lightweight Hono runtime choice for those service HTTP boundaries.

The documented rationale is composition and browser-boundary clarity. The inferred rationale is that a single frontend-facing API surface reduces pressure for frontend code to learn backend-service topology, service-token handling, or service-specific failure modes. That inference follows from [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md) and the `API Gateway` and `Frontend Procedure` vocabulary in [`CONTEXT.md`](../../CONTEXT.md), but the ADR does not list every avoided coupling explicitly.

### Frontend Architecture

The frontend uses React, Vite, TanStack, and Jotai per [`ADR-0017`](../adr/0017-use-react-vite-tanstack-and-jotai-for-frontend.md). ADR-0017 is brief, so this guide should not invent deeper framework rationale than the source material provides. The source-backed rationale is deliberately narrow: React is the UI rendering foundation, Vite owns frontend development and browser env loading, TanStack provides router/form structure, and Jotai provides focused client state.

The stronger documented frontend boundary is the Frontend API Adapter. [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md) says frontend components use the Frontend API Adapter instead of raw oRPC clients or published contracts. The contracts define the network boundary, but UI components receive frontend-owned models and callbacks from the adapter layer. The production adapter delegates to the API Gateway oRPC client, while tests and stories can replace it with fakes for logged-in, logged-out, and error states without running Identity, Better Auth, or service databases.

The [`README` tests section](../../README.md#tests) turns that architecture choice into a maintained rule: the check command includes a custom seam rule that prevents frontend UI files from importing `@megiddo/contracts` or raw oRPC clients directly. [`CONTEXT.md`](../../CONTEXT.md) uses the same vocabulary and defines `Frontend API Adapter` as a frontend-owned boundary, not a thin import convenience.

The rationale is partly documented and partly inferred. Documented: components stay focused, contract mapping belongs in the adapter, and focused frontend tests can use fake adapters. Inferred: keeping published contracts below the adapter gives the UI permission to use view-friendly names and models without forcing every component to track contract-version churn.

### Contract Evolution

Megiddo treats contracts as published public boundaries rather than internal service APIs. [`ADR-0001`](../adr/0001-version-published-contracts-append-only.md) establishes append-only published contract versions once a version is stable: compatible additions can extend a version, but breaking changes require a new version instead of rewriting existing consumers. [`ADR-0007`](../adr/0007-version-contract-surfaces-and-builders.md) narrows that rule to versioned contract surfaces such as gateway, service, or operational surfaces, so different caller relationships can evolve independently instead of being tied to one global contract object.

Contract helpers are also part of the public surface when they generate public shapes. [`ADR-0008`](../adr/0008-version-contract-builders-by-contract-visible-concern.md) records that contract builders are versioned by contract-visible concern, because changing a builder can alter every surface that uses it. [`CONTEXT.md`](../../CONTEXT.md) reinforces this vocabulary with Contract Surface, Contract Builder, Resource Schema, and Resource Schema Version.

Versioning is runtime behavior, not only TypeScript organization. [`ADR-0009`](../adr/0009-support-multiple-live-contract-versions.md) requires support for multiple live contract versions so older and newer clients can coexist during migration. [`ADR-0013`](../adr/0013-make-contract-versions-runtime-addressable.md) makes runtime-addressable contract versions explicit, so a caller or token can identify the intended version without relying on package import paths alone. The [`Architecture History Source Inventory`](architecture-history-source-inventory.md) cautions that these ADRs establish policy; this guide should not claim a specific service currently serves multiple versions unless current routes or tests prove it.

Contract smoke tests sit beside this versioning model. [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md) and the [`README` tests section](../../README.md#tests) define them as thin runtime-conformance tests. Their job is to prove that runtime routing, validation, auth/error mapping, and representative success paths match the published contract; they are not a second copy of the TypeScript type system.

### Identity And Auth

Identity owns authentication integration and Identity Token issuance, but those are separate concerns. [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) distinguishes the Auth Provider Adapter, the Identity Token codec, and the browser session. The Auth Provider Adapter wraps an auth library or dummy provider inside Identity. The Identity Token codec issues and verifies service-facing token wire formats. The browser session proves a browser is signed in, normally through Identity-owned session cookies routed through the API Gateway rather than exposing service tokens to browser code. [`CONTEXT.md`](../../CONTEXT.md) defines the same terms as Auth Provider Adapter, Token Codec, Identity Token, Token Verifier, and Browser Session.

Services verify Identity Tokens at their own boundary. [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md) says backend services verify raw Identity Tokens for user-scoped operations rather than trusting the API Gateway to pass a normalized user context. The gateway may verify tokens for its own procedures, but each independently runnable service enforces its own authorization boundary using the Identity-issued token. [`ADR-0003`](../adr/0003-identity-issues-asymmetric-user-tokens.md) records the Identity-issued user-token model, and the [`README`](../../README.md#local-development) reflects the local dummy version: Identity issues dummy Identity Tokens and Todo verifies those same tokens at its service boundary.

Token cryptography and other platform concerns live behind seams. [`ADR-0004`](../adr/0004-keep-token-cryptography-behind-a-seam.md) keeps signing and verification behind a narrow cryptography seam so the repository can change algorithms or libraries without spreading that choice through services. [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) applies the same shape to dummy and JWT/JWS token codecs: `IDENTITY_TOKEN_CODEC=dummy | jwt-jws` selects the wire-format implementation, while `IDENTITY_AUTH_PROVIDER=dummy | better-auth` selects the auth-provider side.

Dummy auth and dummy tokens are local-development concerns, not production security. [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md) starts with a development identity provider behind the Auth Provider Adapter, while [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) says dummy auth and dummy tokens are refused when `NODE_ENV=production`. The [`README`](../../README.md#local-development) describes the local dummy auth profile with inspectable dummy Identity Tokens, and the [`Env Catalog`](env-catalog.md) records that dummy auth and dummy token modes are rejected in production. Therefore dummy credentials must not be accepted in production.

The documented rationale is local authorization and swappable infrastructure. The inferred rationale is defense against accidental gateway centralization: if Todo verifies the token itself, an API Gateway bug or test double cannot silently become Todo's authorization model. [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md) supports that inference by naming the service boundary as the enforcement point.

Several identity sources are historical context, not current architecture. The [`Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md) explicitly says issue #34 replaced the transitional custom compact token codec with the `jwt-jws` direction. Its browser-held gateway token path, public development token issuance, and compact format should be read as baseline and gap analysis before later identity slices, not as the current architecture.

### Persistence

Megiddo uses embedded local persistence behind adapters so early development can have durable local data without committing service logic to a shared database. [`ADR-0005`](../adr/0005-use-embedded-local-persistence-behind-adapters.md) records the adapter boundary: each service owns its Persistence Adapter and can change local embedded storage or later deployment storage without exposing a repo-wide data layer. [`CONTEXT.md`](../../CONTEXT.md) defines this as a service-owned boundary around durable storage.

The lifecycle is also service-owned. [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md) establishes a service-owned test and development persistence lifecycle, so each service is responsible for creating, seeding, resetting, and isolating its own dev/test data. The [`README`](../../README.md#local-development) points local users to the current local data workflow instead of making them infer data locations from implementation files.

[`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) is transitional. It records the first tracer-bullet decision to start with in-memory repositories, which was appropriate for proving a thin vertical slice. Current local development should be described as file-backed embedded persistence behind adapters, while in-memory persistence remains a focused-test tool. Treating ADR-0020 this way prevents the first-slice shortcut from being mistaken for the current persistence direction.

### Local Development And Testing

Megiddo uses real service processes in local development and fakes in focused tests. [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md) is the canonical decision: normal local development runs services as separate localhost processes so package and service boundaries are exercised, while focused unit and component tests may use in-process fakes or contract-compatible adapters. The [`README`](../../README.md#local-development) is the operational source for current commands and ports, so this guide links there rather than copying the command walkthrough.

Use the real-process topology when the behavior being checked depends on process boundaries, service URLs, gateway-to-service oRPC calls, browser session routing, service-token issuance, persistence lifecycle, or local telemetry. The [`README`](../../README.md#local-development) describes the full local topology, and its [`Tests`](../../README.md#tests) section describes representative real Identity, Todo, and API service processes driving the authenticated frontend-facing todo path through the production Frontend API Adapter.

Use focused fakes when the behavior belongs inside one boundary and the external service is not the subject of the test. [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md) supports fake Frontend API Adapters for component tests and stories. [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md) supports in-process fakes or contract-compatible adapters for focused tests. [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md) keeps contract smoke tests thin so they prove runtime routing, validation, auth/error mapping, and representative success paths without duplicating type checks.

The documented rationale is speed for focused tests and representative boundary coverage for local integration. The inferred rationale is that fakes are acceptable only when they preserve the boundary being tested rather than replacing the boundary with implementation sharing.

### Telemetry And Developer Observability

Local observability is based on OpenTelemetry rather than a custom Megiddo trace format. [`ADR-0021`](../adr/0021-use-opentelemetry-spans-for-local-developer-observability.md) records OpenTelemetry spans as the local developer observability model, and [`CONTEXT.md`](../../CONTEXT.md) defines Telemetry Span and Service Name for that vocabulary.

Export is deliberately best effort. [`ADR-0022`](../adr/0022-use-best-effort-local-telemetry-export.md) and the README [`Local Telemetry Viewer`](../../README.md#local-telemetry-viewer) section say local Services attempt best-effort local OpenTelemetry export without making the viewer part of service startup or serving requirements. This means a missing local viewer should reduce observability, not stop the API Gateway, Identity Service, or Todo Service from starting.

Megiddo evaluated existing local OpenTelemetry viewers before building custom tooling. [`ADR-0023`](../adr/0023-evaluate-existing-local-opentelemetry-viewers-before-building-devtools-ui.md) records the policy, and the [`local OpenTelemetry viewer evaluation report`](../reports/2026-07-05-local-opentelemetry-viewers.md) records the evidence for selecting `otel-gui` after trying existing options against Megiddo traces. Rejected candidates in that report are historical evaluation context. A custom Developer Log View remains a possible future product choice, not the default first response.

### Environment Configuration

Environment handling follows owned Env Contracts and derived Config objects. [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) records the current rule: each service or script owns the complete Env Contract for the variables it reads, validates a supplied runtime environment, and then derives a Service Config or Script Config for application wiring. [`CONTEXT.md`](../../CONTEXT.md) defines Service Env Contract, Script Env Contract, Service Config, Script Config, Runtime Env, and Env Schema Fragment with the same boundary.

The Env Catalog is a documentation and checking artifact rather than a runtime import surface. The generated [`Env Catalog`](env-catalog.md) says it is documentation/check tooling only, and services must keep validating their own runtime env through owned Env Contracts. The [`README`](../../README.md#local-development) complements that rule by explaining that Node services and scripts do not load `.env` files themselves; they validate the runtime environment the process receives. Vite remains the frontend-specific exception because it owns browser env loading.

The [`environment variables report`](../reports/2026-07-06-environment-variables.md) is historical context, not current architecture. It preserves the pre-migration inventory and explains why Env Contracts and generated catalog collation were needed. For current behavior, use [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md), the [`Env Catalog`](env-catalog.md), and the [`README`](../../README.md#local-development) env-loading section.

### Production-Shaped Staging Deployment

Megiddo's first cloud deployment target is production-shaped staging, not full production. [`ADR-0026`](../adr/0026-use-production-shaped-staging-on-fly-with-service-owned-sqlite-volumes.md) records the deployment shape: Frontend, API Gateway, Identity, and Todo remain separate deployable Services; private service networking is exercised; real token signing is used; and Identity and Todo keep service-owned SQLite files on durable volumes for the first staging slice. The supported rationale is to expose deployment, networking, auth, and persistence integration problems earlier than local pnpm development can, while deliberately avoiding the full burden of production uptime, backups, migrations, and horizontal scaling.

Fly is the first staging provider, not a permanent platform commitment. [`ADR-0028`](../adr/0028-use-fly-for-the-first-production-shaped-staging-deployment.md) chooses Fly because separate apps, private networking, containers, and durable volumes fit the existing Service topology and Persistence Adapter shape with little application-code change. Provider-specific choices should stay in deployment files and runtime environment values so application code remains portable.

The staging topology preserves the existing browser and backend boundaries. [`ADR-0027`](../adr/0027-configure-frontend-api-url-through-frontend-env-contract.md) keeps the frontend as a separate deployable Service and configures the browser-facing API Gateway URL through the frontend-owned Env Contract instead of hardcoding localhost or folding static frontend serving into the API Gateway. The PRD and runbook preserve the public/private split: Frontend and API Gateway are public; Identity and Todo are private-only unless a Better Auth browser-flow constraint forces a documented boundary change.

Staging Identity is intentionally production-mode. [`ADR-0029`](../adr/0029-use-production-mode-identity-in-staging.md) says staging uses Better Auth and JWT/JWS Identity Tokens, with signing material and internal service secrets supplied through the deployment platform secret store. This prevents staging from succeeding only because local dummy auth or dummy token codecs were enabled.

Local Compose is the mandatory deployment rehearsal for this topology, not a replacement for `pnpm dev`. [`ADR-0031`](../adr/0031-rehearse-staging-topology-with-local-compose.md) requires Compose to exercise container builds, service separation, internal networking, mounted persistence, frontend-to-API configuration, and production-mode Identity. The [`README`](../../README.md#local-development) points to the current rehearsal commands and the [`Staging Deployment Runbook`](../runbooks/staging-deployment.md) is the canonical operator procedure.

First staging keeps observability and persistence lifecycle deliberately small. [`ADR-0030`](../adr/0030-start-staging-observability-with-platform-logs-and-health-checks.md) starts with platform logs and HTTP health checks rather than hosted OpenTelemetry. [`ADR-0032`](../adr/0032-defer-database-migrations-for-first-staging-deployment.md) defers database migrations and treats first staging data as fresh-volume deployment data. The tradeoff is explicit: first staging is useful for topology proof, but it is not production-ready data operations.

## Decision Index

| Theme | Canonical decisions | Supporting sources |
| --- | --- | --- |
| Tracer-bullet strategy | [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md), [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) | [`Architecture History Source Inventory`](architecture-history-source-inventory.md), [`README`](../../README.md#local-development) |
| API Gateway and service topology | [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md), [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md), [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md), [`ADR-0016`](../adr/0016-use-hono-for-service-http-runtime.md), [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) | [`CONTEXT.md`](../../CONTEXT.md), [`README`](../../README.md#local-development) |
| Frontend API Adapter and frontend stack | [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md), [`ADR-0017`](../adr/0017-use-react-vite-tanstack-and-jotai-for-frontend.md) | [`README` tests section](../../README.md#tests), [`CONTEXT.md`](../../CONTEXT.md) |
| Contract versioning and smoke tests | [`ADR-0001`](../adr/0001-version-published-contracts-append-only.md), [`ADR-0007`](../adr/0007-version-contract-surfaces-and-builders.md), [`ADR-0008`](../adr/0008-version-contract-builders-by-contract-visible-concern.md), [`ADR-0009`](../adr/0009-support-multiple-live-contract-versions.md), [`ADR-0013`](../adr/0013-make-contract-versions-runtime-addressable.md), [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md) | [`README` tests section](../../README.md#tests), [`CONTEXT.md`](../../CONTEXT.md) |
| Identity, auth, and token boundaries | [`ADR-0003`](../adr/0003-identity-issues-asymmetric-user-tokens.md), [`ADR-0004`](../adr/0004-keep-token-cryptography-behind-a-seam.md), [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md), [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md), [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md), [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) | [`identity report`](../reports/2026-07-06-identity-service-current-state.md), [`CONTEXT.md`](../../CONTEXT.md), [`README`](../../README.md#local-development) |
| Persistence | [`ADR-0005`](../adr/0005-use-embedded-local-persistence-behind-adapters.md), [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md), [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) | [`README`](../../README.md#local-development), [`CONTEXT.md`](../../CONTEXT.md) |
| Local development and testing | [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md), [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md), [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md), [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md) | [`README`](../../README.md#local-development), [`README` tests section](../../README.md#tests) |
| Telemetry | [`ADR-0021`](../adr/0021-use-opentelemetry-spans-for-local-developer-observability.md), [`ADR-0022`](../adr/0022-use-best-effort-local-telemetry-export.md), [`ADR-0023`](../adr/0023-evaluate-existing-local-opentelemetry-viewers-before-building-devtools-ui.md) | [`local viewer evaluation report`](../reports/2026-07-05-local-opentelemetry-viewers.md), [`Local Telemetry Viewer`](../../README.md#local-telemetry-viewer) |
| Environment configuration | [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) | [`Env Catalog`](env-catalog.md), [`environment variables report`](../reports/2026-07-06-environment-variables.md), [`README`](../../README.md#local-development) |
| Production-shaped staging deployment | [`ADR-0026`](../adr/0026-use-production-shaped-staging-on-fly-with-service-owned-sqlite-volumes.md), [`ADR-0027`](../adr/0027-configure-frontend-api-url-through-frontend-env-contract.md), [`ADR-0028`](../adr/0028-use-fly-for-the-first-production-shaped-staging-deployment.md), [`ADR-0029`](../adr/0029-use-production-mode-identity-in-staging.md), [`ADR-0030`](../adr/0030-start-staging-observability-with-platform-logs-and-health-checks.md), [`ADR-0031`](../adr/0031-rehearse-staging-topology-with-local-compose.md), [`ADR-0032`](../adr/0032-defer-database-migrations-for-first-staging-deployment.md) | [`Staging Deployment Runbook`](../runbooks/staging-deployment.md), [`First Live Fly Deploy Handoff`](../runbooks/first-live-fly-deploy-handoff.md), [`README`](../../README.md#local-development) |

## Supporting Sources

- [`Architecture History Source Inventory`](architecture-history-source-inventory.md): source roles, theme inventory, issue clusters, transitional warnings, and recommended source order for this document.
- [`README`](../../README.md#local-development): current operational overview, local-development workflow, topology, env-loading policy, and local data behavior.
- [`README` tests section](../../README.md#tests): current test commands, frontend adapter seam rule, integration-test shape, and contract smoke-test guidance.
- [`Local Telemetry Viewer`](../../README.md#local-telemetry-viewer): selected local telemetry viewer workflow.
- [`CONTEXT.md`](../../CONTEXT.md): repository vocabulary and terms used across the architecture narrative.
- [`Env Catalog`](env-catalog.md): generated environment-variable inventory grouped by owner and surface.
- [`2026-07-05 local OpenTelemetry viewers report`](../reports/2026-07-05-local-opentelemetry-viewers.md): evidence for selecting an existing telemetry viewer before custom devtools.
- [`2026-07-06 Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md): historical baseline and gap analysis before later identity slices.
- [`2026-07-06 environment variables report`](../reports/2026-07-06-environment-variables.md): pre-Env-Contract snapshot and migration rationale.
- [`Staging Deployment Runbook`](../runbooks/staging-deployment.md): canonical manual procedure for Compose rehearsal, secret generation, Fly setup, deploy commands, verification, and known limitations.
- [`First Live Fly Deploy Handoff`](../runbooks/first-live-fly-deploy-handoff.md): operator checklist and evidence template for credentialed first live Fly deployment.

## Known Transitional Decisions

- [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) records the first tracer-bullet persistence choice. Do not present in-memory repositories as the current local-development persistence strategy.
- [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md) records the initial development identity provider direction. Continue the identity narrative through [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) before describing current auth boundaries.
- The [`Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md) is historical. Its custom compact token format, browser-held gateway token path, and public development token issuance should be described as prior state or gap analysis, not current architecture.
- The [`environment variables report`](../reports/2026-07-06-environment-variables.md) is historical. It is a pre-migration snapshot; use [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) and the [`Env Catalog`](env-catalog.md) for current env architecture.
- The [`local OpenTelemetry viewers report`](../reports/2026-07-05-local-opentelemetry-viewers.md) contains rejected viewer candidates. Those failures are evaluation evidence, not current runtime architecture.
- [`ADR-0028`](../adr/0028-use-fly-for-the-first-production-shaped-staging-deployment.md) is a temporary first-provider choice, not a permanent cloud-platform commitment.
- The first staging deployment deliberately defers production concerns: hosted telemetry, database migrations, backups, custom domains, CI/CD, and horizontal scaling for stateful Services. Do not describe the staging deployment as full production readiness.

## Validation Note

Issue #54 validation is encoded in `tests/development-history-doc.test.ts`. The test checks local Markdown link targets and heading anchors, required source-backed architecture claims, transitional wording, and the rule that this guide links to README sections instead of duplicating operational command blocks.

## Maintenance Guidance

Update this document when a new ADR lands, a major architecture report lands, or an implementation slice changes the supported interpretation of an existing decision. The update should keep the ADR as the canonical decision record and adjust this guide only as the cross-decision narrative.

When updating this guide:

- Add or adjust the relevant theme anchor and decision-index row.
- Add supporting links only to sources that exist in the repository or stable issue history.
- Mark transitional or superseded material clearly instead of deleting the history.
- Link to canonical operational docs such as the README and Env Catalog instead of copying commands or environment-variable tables.
- Preserve the distinction between fact, documented rationale, and inferred rationale.
- Avoid file-path-level implementation walkthroughs unless the path identifies a canonical document.
