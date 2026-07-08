# Development History And Architecture Rationale

Issue: #52. Parent PRD: #49.

This document is the primary development-history and architecture-rationale guide for Megiddo. It explains the current architecture by tying each major claim back to existing ADRs, reports, README sections, generated docs, repository vocabulary, or issue clusters. It is not a complete implementation walkthrough.

## Purpose

This document is a narrative index and explanatory guide across Megiddo's development history and architecture decisions. It explains how the project moved from a thin end-to-end tracer bullet toward its current shape: a React frontend, API Gateway, Identity Service, Todo Service, published oRPC contracts, and platform seams.

It is not a replacement for ADRs. ADRs remain the source of record for individual decisions. When this guide summarizes an architectural choice, readers should be able to follow the link to the relevant ADR, report, README section, catalog, or issue cluster for the evidence behind the claim.

This guide should stay at architecture-narrative level. It should avoid stale code-level walkthroughs and should point to canonical operational docs, especially the [`README`](../../README.md), when a reader needs current commands or local workflow details.

## Canonical Source Rules

- Treat [`docs/adr/`](../adr/) as canonical for individual architecture decisions.
- Treat the [`Architecture History Source Inventory`](architecture-history-source-inventory.md) as the current map of supported sources, transitional material, and cautions for this narrative work.
- Treat the [`README`](../../README.md) as canonical for current local-development commands, topology ports, telemetry viewer workflow, env-loading policy, and test commands.
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

## Architecture Themes

These themes summarize the current direction supported by existing sources. Each section keeps ADRs as the canonical decisions and uses reports, README material, the Env Catalog, and issue clusters as supporting evidence or historical context.

### Tracer-Bullet Strategy

Megiddo starts by proving thin end-to-end behavior before deepening internals. [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md) records the strategy, while [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) records the initial in-memory repository choice for the first slice. Current prose must distinguish that first slice from later local-dev embedded persistence.

### Service Boundaries And API Gateway

The API Gateway is the frontend-facing API surface and composition boundary. [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md) is the starting point, with browser auth and session routing continued by [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md) and [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md). The guide should explain why browser code does not call every backend service directly.

### Frontend Architecture

The frontend uses React, Vite, TanStack, and Jotai per [`ADR-0017`](../adr/0017-use-react-vite-tanstack-and-jotai-for-frontend.md). The source-backed rationale is deliberately narrow: React is the UI rendering foundation, Vite owns frontend development and browser env loading, TanStack provides router/form structure, and Jotai provides focused client state. The [`Architecture History Source Inventory`](architecture-history-source-inventory.md) cautions that ADR-0017 is brief, so this guide should not add deeper stack motivations unless a later ADR or issue records them.

The frontend does not bind components directly to raw oRPC clients or published backend contracts. [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md) makes the Frontend API Adapter the UI seam above oRPC, and the [`README`](../../README.md) testing guidance treats that seam as the place for focused frontend fakes. That keeps UI tests from needing Identity, Better Auth, service databases, or networked contract clients for every component path.

### Contract Evolution

Megiddo treats contracts as published public boundaries rather than internal service APIs. [`ADR-0001`](../adr/0001-version-published-contracts-append-only.md) establishes append-only published contract versions once a version is stable: compatible additions can extend a version, but breaking changes require a new version instead of rewriting existing consumers. [`ADR-0007`](../adr/0007-version-contract-surfaces-and-builders.md) narrows that rule to versioned contract surfaces such as gateway, service, or operational surfaces, so different caller relationships can evolve independently instead of being tied to one global contract object.

Contract helpers are also part of the public surface when they generate public shapes. [`ADR-0008`](../adr/0008-version-contract-builders-by-contract-visible-concern.md) records that contract builders are versioned by contract-visible concern, because changing a builder can alter every surface that uses it. [`CONTEXT.md`](../../CONTEXT.md) reinforces this vocabulary with Contract Surface, Contract Builder, Resource Schema, and Resource Schema Version.

Versioning is runtime behavior, not only TypeScript organization. [`ADR-0009`](../adr/0009-support-multiple-live-contract-versions.md) requires support for multiple live contract versions so older and newer clients can coexist during migration. [`ADR-0013`](../adr/0013-make-contract-versions-runtime-addressable.md) makes runtime-addressable contract versions explicit, so a caller or token can identify the intended version without relying on package import paths alone. The [`Architecture History Source Inventory`](architecture-history-source-inventory.md) cautions that these ADRs establish policy; this guide should not claim a specific service currently serves multiple versions unless current routes or tests prove it.

Contract smoke tests sit beside this versioning model. [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md) and the [`README`](../../README.md) define them as thin runtime-conformance tests. Their job is to prove that runtime routing, validation, auth/error mapping, and representative success paths match the published contract; they are not a second copy of the TypeScript type system.

### Identity And Auth

Identity owns authentication integration and Identity Token issuance, but those are separate concerns. [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) distinguishes the Auth Provider Adapter, the Identity Token codec, and the browser session. The Auth Provider Adapter wraps an auth library or dummy provider inside Identity. The Identity Token codec issues and verifies service-facing token wire formats. The browser session proves a browser is signed in, normally through Identity-owned session cookies routed through the API Gateway rather than exposing service tokens to browser code. [`CONTEXT.md`](../../CONTEXT.md) defines the same terms as Auth Provider Adapter, Token Codec, Identity Token, Token Verifier, and Browser Session.

Services still make authorization local at their boundary. [`ADR-0003`](../adr/0003-identity-issues-asymmetric-user-tokens.md) records Identity-issued user tokens, [`ADR-0004`](../adr/0004-keep-token-cryptography-behind-a-seam.md) keeps token cryptography behind a swappable seam, and [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md) requires services to verify Identity Tokens rather than trusting an upstream gateway assertion. That keeps the Todo Service responsible for validating the credential it accepts for Todo operations.

Dummy auth and dummy tokens are local-development conveniences, not production security. [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md) starts with a development identity provider behind the Auth Provider Adapter, while [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) continues the design with explicit dummy and `jwt-jws` token-codec directions. The [`README`](../../README.md) describes `pnpm dev` as starting the local dummy auth profile with inspectable dummy Identity Tokens, and the [`Env Catalog`](env-catalog.md) records that dummy auth and dummy token modes are rejected in production. Therefore dummy credentials must not be accepted in production.

Several identity sources are historical context, not current architecture. The [`Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md) explicitly says issue #34 replaced the transitional custom compact token codec with the `jwt-jws` direction. Its browser-held gateway token path, public development token issuance, and compact format should be read as baseline and gap analysis before later identity slices, not as the current architecture.

### Persistence

Megiddo uses embedded local persistence behind adapters so early development can have durable local data without committing service logic to a shared database. [`ADR-0005`](../adr/0005-use-embedded-local-persistence-behind-adapters.md) records the adapter boundary: each service owns its Persistence Adapter and can change local embedded storage or later deployment storage without exposing a repo-wide data layer. [`CONTEXT.md`](../../CONTEXT.md) defines this as a service-owned boundary around durable storage.

The lifecycle is also service-owned. [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md) establishes a service-owned test and development persistence lifecycle, so each service is responsible for creating, seeding, resetting, and isolating its own dev/test data. The [`README`](../../README.md) points local users to the current local data workflow instead of making them infer data locations from implementation files.

[`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) is transitional. It records the first tracer-bullet decision to start with in-memory repositories, which was appropriate for proving a thin vertical slice. Current local development should be described as file-backed embedded persistence behind adapters, while in-memory persistence remains a focused-test tool. Treating ADR-0020 this way prevents the first-slice shortcut from being mistaken for the current persistence direction.

### Local Development And Testing

Local development runs real service processes for representative integration while focused tests use fakes. Use [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md), [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md), and the [`README`](../../README.md). This guide should link to the README for commands rather than copying them.

### Telemetry And Developer Observability

Local observability is based on OpenTelemetry rather than a custom Megiddo trace format. [`ADR-0021`](../adr/0021-use-opentelemetry-spans-for-local-developer-observability.md) records OpenTelemetry spans as the local developer observability model, and [`CONTEXT.md`](../../CONTEXT.md) defines Telemetry Span and Service Name for that vocabulary.

Export is deliberately best effort. [`ADR-0022`](../adr/0022-use-best-effort-local-telemetry-export.md) and the [`README`](../../README.md) say local Services attempt best-effort local OpenTelemetry export without making the viewer part of service startup or serving requirements. This means a missing local viewer should reduce observability, not stop the API Gateway, Identity Service, or Todo Service from starting.

Megiddo evaluated existing local OpenTelemetry viewers before building custom tooling. [`ADR-0023`](../adr/0023-evaluate-existing-local-opentelemetry-viewers-before-building-devtools-ui.md) records the policy, and the [`local OpenTelemetry viewer evaluation report`](../reports/2026-07-05-local-opentelemetry-viewers.md) records the evidence for selecting `otel-gui` after trying existing options against Megiddo traces. Rejected candidates in that report are historical evaluation context. A custom Developer Log View remains a possible future product choice, not the default first response.

### Environment Configuration

Environment handling follows owned Env Contracts and derived Config objects. [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) records the current rule: each service or script owns the complete Env Contract for the variables it reads, validates a supplied runtime environment, and then derives a Service Config or Script Config for application wiring. [`CONTEXT.md`](../../CONTEXT.md) defines Service Env Contract, Script Env Contract, Service Config, Script Config, Runtime Env, and Env Schema Fragment with the same boundary.

The Env Catalog is a documentation and checking artifact rather than a runtime import surface. The generated [`Env Catalog`](env-catalog.md) says it is documentation/check tooling only, and services must keep validating their own runtime env through owned Env Contracts. The [`README`](../../README.md) complements that rule by explaining that Node services and scripts do not load `.env` files themselves; they validate the runtime environment the process receives. Vite remains the frontend-specific exception because it owns browser env loading.

The [`environment variables report`](../reports/2026-07-06-environment-variables.md) is historical context, not current architecture. It preserves the pre-migration inventory and explains why Env Contracts and generated catalog collation were needed. For current behavior, use [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md), the [`Env Catalog`](env-catalog.md), and the [`README`](../../README.md) env-loading section.

## Decision Index

| Theme | Canonical decisions | Supporting sources |
| --- | --- | --- |
| Tracer-bullet strategy | [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md), [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) | [`Architecture History Source Inventory`](architecture-history-source-inventory.md), [`README`](../../README.md) overview |
| API Gateway and service topology | [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md), [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md), [`ADR-0016`](../adr/0016-use-hono-for-service-http-runtime.md) | [`CONTEXT.md`](../../CONTEXT.md), [`README`](../../README.md) |
| Frontend API Adapter and frontend stack | [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md), [`ADR-0017`](../adr/0017-use-react-vite-tanstack-and-jotai-for-frontend.md) | [`README`](../../README.md), [`CONTEXT.md`](../../CONTEXT.md) |
| Contract versioning and smoke tests | [`ADR-0001`](../adr/0001-version-published-contracts-append-only.md), [`ADR-0007`](../adr/0007-version-contract-surfaces-and-builders.md), [`ADR-0008`](../adr/0008-version-contract-builders-by-contract-visible-concern.md), [`ADR-0009`](../adr/0009-support-multiple-live-contract-versions.md), [`ADR-0013`](../adr/0013-make-contract-versions-runtime-addressable.md), [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md) | [`README`](../../README.md), [`CONTEXT.md`](../../CONTEXT.md) |
| Identity, auth, and token boundaries | [`ADR-0003`](../adr/0003-identity-issues-asymmetric-user-tokens.md), [`ADR-0004`](../adr/0004-keep-token-cryptography-behind-a-seam.md), [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md), [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md), [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md), [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) | [`identity report`](../reports/2026-07-06-identity-service-current-state.md), [`CONTEXT.md`](../../CONTEXT.md) |
| Persistence | [`ADR-0005`](../adr/0005-use-embedded-local-persistence-behind-adapters.md), [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md), [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) | [`README`](../../README.md), [`CONTEXT.md`](../../CONTEXT.md) |
| Telemetry | [`ADR-0021`](../adr/0021-use-opentelemetry-spans-for-local-developer-observability.md), [`ADR-0022`](../adr/0022-use-best-effort-local-telemetry-export.md), [`ADR-0023`](../adr/0023-evaluate-existing-local-opentelemetry-viewers-before-building-devtools-ui.md) | [`local viewer evaluation report`](../reports/2026-07-05-local-opentelemetry-viewers.md), [`README`](../../README.md) |
| Environment configuration | [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) | [`Env Catalog`](env-catalog.md), [`environment variables report`](../reports/2026-07-06-environment-variables.md), [`README`](../../README.md) |

## Supporting Sources

- [`Architecture History Source Inventory`](architecture-history-source-inventory.md): source roles, theme inventory, issue clusters, transitional warnings, and recommended source order for this document.
- [`README`](../../README.md): current operational overview, local-development workflow, telemetry viewer workflow, env-loading policy, and test commands.
- [`CONTEXT.md`](../../CONTEXT.md): repository vocabulary and terms used across the architecture narrative.
- [`Env Catalog`](env-catalog.md): generated environment-variable inventory grouped by owner and surface.
- [`2026-07-05 local OpenTelemetry viewers report`](../reports/2026-07-05-local-opentelemetry-viewers.md): evidence for selecting an existing telemetry viewer before custom devtools.
- [`2026-07-06 Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md): historical baseline and gap analysis before later identity slices.
- [`2026-07-06 environment variables report`](../reports/2026-07-06-environment-variables.md): pre-Env-Contract snapshot and migration rationale.

## Known Transitional Decisions

- [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) records the first tracer-bullet persistence choice. Do not present in-memory repositories as the current local-development persistence strategy.
- [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md) records the initial development identity provider direction. Continue the identity narrative through [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md) before describing current auth boundaries.
- The [`Identity Service current-state report`](../reports/2026-07-06-identity-service-current-state.md) is historical. Its custom compact token format, browser-held gateway token path, and public development token issuance should be described as prior state or gap analysis, not current architecture.
- The [`environment variables report`](../reports/2026-07-06-environment-variables.md) is a pre-migration snapshot. Use [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md) and the [`Env Catalog`](env-catalog.md) for current env architecture.
- The [`local OpenTelemetry viewers report`](../reports/2026-07-05-local-opentelemetry-viewers.md) contains rejected viewer candidates. Those failures are evaluation evidence, not current runtime architecture.

## Maintenance Guidance

Update this document when a new ADR lands, a major architecture report lands, or an implementation slice changes the supported interpretation of an existing decision. The update should keep the ADR as the canonical decision record and adjust this guide only as the cross-decision narrative.

When updating this guide:

- Add or adjust the relevant theme anchor and decision-index row.
- Add supporting links only to sources that exist in the repository or stable issue history.
- Mark transitional or superseded material clearly instead of deleting the history.
- Link to canonical operational docs such as the README and Env Catalog instead of copying commands or environment-variable tables.
- Preserve the distinction between fact, documented rationale, and inferred rationale.
- Avoid file-path-level implementation walkthroughs unless the path identifies a canonical document.
