# Development History And Architecture Rationale

Issue: #51. Parent PRD: #49.

This document is the primary development-history and architecture-rationale guide for Megiddo. It is intentionally a skeleton for the first narrative slice: it fixes the document's durable frame, source rules, timeline shape, theme placeholders, and maintenance contract so later slices can fill in richer prose without changing the role of the document.

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

Later slices should turn these theme anchors into fuller narrative sections. Until then, each anchor records the claim boundary and canonical starting points.

### Tracer-Bullet Strategy

Megiddo starts by proving thin end-to-end behavior before deepening internals. [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md) records the strategy, while [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) records the initial in-memory repository choice for the first slice. Current prose must distinguish that first slice from later local-dev embedded persistence.

### Service Boundaries And API Gateway

The API Gateway is the frontend-facing API surface and composition boundary. [`ADR-0002`](../adr/0002-use-api-gateway-for-frontend-api-surface.md) is the starting point, with browser auth and session routing continued by [`ADR-0010`](../adr/0010-route-browser-auth-through-api-gateway.md) and [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md). The guide should explain why browser code does not call every backend service directly.

### Frontend Architecture

The frontend uses React, Vite, TanStack, and Jotai per [`ADR-0017`](../adr/0017-use-react-vite-tanstack-and-jotai-for-frontend.md). The Frontend API Adapter seam is canonicalized by [`ADR-0006`](../adr/0006-use-frontend-api-adapter-above-orpc.md). This guide should not invent deeper stack rationale than the ADRs and supported issue history provide.

### Contract Evolution

Published contract versions are append-only after stabilization, contract builders are versioned as contract-visible concerns, and runtime behavior can address contract versions explicitly. Start from [`ADR-0001`](../adr/0001-version-published-contracts-append-only.md), [`ADR-0007`](../adr/0007-version-contract-surfaces-and-builders.md), [`ADR-0008`](../adr/0008-version-contract-builders-by-contract-visible-concern.md), [`ADR-0009`](../adr/0009-support-multiple-live-contract-versions.md), [`ADR-0013`](../adr/0013-make-contract-versions-runtime-addressable.md), and [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md).

### Identity And Auth

Identity owns user-token issuance, auth-provider integration, token-codec choices, and browser-session concerns. Services verify Identity Tokens at their own boundary. Start from [`ADR-0003`](../adr/0003-identity-issues-asymmetric-user-tokens.md), [`ADR-0004`](../adr/0004-keep-token-cryptography-behind-a-seam.md), [`ADR-0012`](../adr/0012-services-verify-identity-tokens-at-their-boundary.md), [`ADR-0019`](../adr/0019-start-with-dev-identity-provider-behind-auth-adapter.md), and [`ADR-0024`](../adr/0024-separate-identity-auth-provider-token-codec-and-browser-session-concerns.md). Dummy auth and dummy tokens are local-development concerns and must not be described as production security.

### Persistence

Persistence starts behind service-owned adapters so local development can use embedded persistence without binding service logic to a shared database. Use [`ADR-0005`](../adr/0005-use-embedded-local-persistence-behind-adapters.md), [`ADR-0015`](../adr/0015-services-own-test-and-dev-persistence-lifecycle.md), and [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md). Distinguish focused-test in-memory persistence from current local-dev file-backed persistence.

### Local Development And Testing

Local development runs real service processes for representative integration while focused tests use fakes. Use [`ADR-0011`](../adr/0011-use-real-service-processes-in-dev-and-fakes-in-focused-tests.md), [`ADR-0014`](../adr/0014-use-contract-smoke-tests-for-runtime-conformance.md), and the [`README`](../../README.md). This guide should link to the README for commands rather than copying them.

### Telemetry And Developer Observability

Local observability is based on OpenTelemetry spans and best-effort export. Use [`ADR-0021`](../adr/0021-use-opentelemetry-spans-for-local-developer-observability.md), [`ADR-0022`](../adr/0022-use-best-effort-local-telemetry-export.md), [`ADR-0023`](../adr/0023-evaluate-existing-local-opentelemetry-viewers-before-building-devtools-ui.md), and the [`local viewer evaluation report`](../reports/2026-07-05-local-opentelemetry-viewers.md). The selected viewer is supporting workflow evidence; failed viewer candidates are historical evaluation context.

### Environment Configuration

Services and scripts own Env Contracts and derive Config objects from validated runtime env inputs. Use [`ADR-0025`](../adr/0025-use-owned-env-contracts-and-derived-config.md), the [`Env Catalog`](env-catalog.md), and the [`environment variables report`](../reports/2026-07-06-environment-variables.md). The report is a pre-migration snapshot; the catalog and ADR are the current sources.

## Decision Index

| Theme | Canonical decisions | Supporting sources |
| --- | --- | --- |
| Tracer-bullet strategy | [`ADR-0018`](../adr/0018-start-with-a-thin-vertical-tracer-bullet.md), [`ADR-0020`](../adr/0020-start-tracer-bullet-with-in-memory-repositories.md) | [`Architecture History Source Inventory`](architecture-history-source-inventory.md), README overview |
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
