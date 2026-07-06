# Megiddo

Megiddo is a TypeScript Turborepo for demonstrating clean architecture across independently runnable example services.

## Language

**Service**:
A separately runnable process with its own package boundary. Some Services own persistence, but stateless or developer-facing Services are still Services.
_Avoid_: Microservice as a mere folder boundary or module namespace, meta-service as a separate category.

**API Gateway**:
A service that exposes the collated public API surface to the frontend and composes calls to backend services through their contracts.
_Avoid_: Frontend server, shared backend, direct service aggregation in the browser.

**Frontend Procedure**:
An API Gateway procedure shaped around a frontend use case, often composed from multiple backend service calls.
_Avoid_: Re-exported service procedure, raw backend endpoint.

**Operational Procedure**:
A contract-defined procedure for service orchestration or readiness rather than domain data, such as a health check.
_Avoid_: Uncontracted side channel, domain use case, OpenTelemetry ingestion endpoint.

**Operational Contract Fragment**:
A reusable versioned contract fragment that gives Services a consistent operational surface, such as `v1.operational.health`, without merging their domain Contract Surfaces.
_Avoid_: Per-service health shape, global operations service, raw health endpoint as the only contract.

**Broken Service Status**:
An operational health status for a Service that can answer its health procedure but cannot handle normal contract calls because an essential dependency or internal capability has failed.
_Avoid_: Blocked, unavailable, unhealthy, degraded.

**Operational Health Reasons**:
One or more human-readable explanations attached to any non-ready operational health status. Ready Services do not include health reasons.
_Avoid_: Stable failure code registry, single reason field, reasons on ready health responses.

**Service Ownership**:
The rule that a service is the source of truth for the data and rules inside its boundary. Other services refer to that data through stable identifiers or contract calls rather than copying ownership.
_Avoid_: Shared ownership, shared database, cross-service entity reuse.

**User Reference**:
A stable identifier for a user owned by the Identity service and stored by another service when it needs to associate data with that user.
_Avoid_: Copied user profile, embedded user entity.

**Principal**:
An entity that can be authenticated and receive authority, such as a user, service, account, or later an advertiser or publisher. A user is a kind of principal, but not every principal must be a human user.
_Avoid_: Treating every authenticated subject as a user, display name as authority.

**Subject Claim**:
The token claim that names the authenticated principal the token is about.
_Avoid_: Display label, username, service audience.

**Identity Token**:
A signed credential issued by the Identity service that lets another service verify the authenticated user without calling Identity for every request.
_Avoid_: API session, shared secret, database lookup.

**Token Codec**:
The Identity service component that issues and verifies the wire format of Identity Tokens, such as dummy inspectable tokens for local development or JWT/JWS for real cryptographic tokens.
_Avoid_: Auth provider, browser session store, user database.

**Audience Claim**:
A token claim that identifies which service or contract surface the Identity Token is intended for.
_Avoid_: Unscoped bearer token, implicit caller trust.

**Contract Version Claim**:
An optional token claim that identifies the intended contract version without encoding that version into another claim value.
_Avoid_: Semantic separators in claim strings, parsed audience values.

**Token Verifier**:
A service component that verifies Identity-issued tokens using public verification material rather than token-signing authority.
_Avoid_: Token issuer, authentication service.

**Persistence Adapter**:
A service-owned boundary around durable storage that lets the service use embedded local persistence during development and a networked database in deployment.
_Avoid_: Shared database layer, global ORM model.

**Package Boundary**:
An import boundary that prevents one service from depending on another service's implementation code. Cross-service reuse happens through contracts or explicit shared platform packages, not through service internals.
_Avoid_: Deep service import, implementation sharing.

**Platform Package**:
A shared package for cross-cutting infrastructure seams such as configuration, logging, cryptography interfaces, oRPC wiring, and test harness helpers.
_Avoid_: Shared domain package, business logic package, service utility dump.

**Service Env Contract**:
The complete environment schema and accessor definition owned by one Service. It is composed from any needed Env Schema Fragments and validates only the variables that Service reads at runtime.
_Avoid_: Global env object, repo-wide runtime configuration, validating unrelated service variables.

**Script Env Contract**:
The complete environment schema and accessor definition owned by one script. It is composed from any needed Env Schema Fragments and validates only the variables that script reads at runtime.
_Avoid_: Global script env object, implicit process.env reads, validating service-only variables.

**Runtime Env**:
The concrete environment values supplied to a Service, frontend app, or script when it runs, such as `PORT=3001`.
_Avoid_: Env schema, accessor definition, generated documentation.

**Env Schema Fragment**:
A reusable environment schema helper for repeated infrastructure concerns, such as ports, local auth profile, token codec selection, or telemetry flags.
_Avoid_: Shared service configuration object, business setting bundle, mandatory global preset.

**Env Catalog**:
A human-facing inventory or check artifact collated from Service Env Contracts, Script Env Contracts, and frontend env contracts. Services do not import the Env Catalog at runtime.
_Avoid_: Runtime env composition root, generated service dependency, hand-maintained env table.

**Telemetry Span**:
A timed OpenTelemetry operation emitted by a Service or frontend adapter, such as an oRPC client call or oRPC server handler.
_Avoid_: Custom message hash, raw console message, unstructured request log.

**Service Name**:
The explicit OpenTelemetry `service.name` value assigned to a Service in the local topology.
_Avoid_: Inferred name from port, package name guessed by devtools, display-only process label.

**Developer Log View**:
A local development view that helps developers inspect telemetry from the running topology, preferably through an existing OpenTelemetry viewer rather than a custom Megiddo UI.
_Avoid_: Production dashboard, log file ownership by each service, unfiltered process output, custom viewer by default.

**Devtools Service**:
A developer-facing Service at `apps/devtools` that receives local telemetry, owns the Telemetry Store, and renders Developer Log Views.
_Avoid_: Runner feature, script-only UI, package-owned observability app.

**Telemetry Viewer Spike**:
A required evaluation of existing local OpenTelemetry viewers against Megiddo's real local traces before building any Megiddo-specific Developer Log View.
_Avoid_: First-result tool adoption, custom TUI as the default plan, production observability stack selection.

**Devtools View Model**:
A presentation-ready representation of telemetry for a Developer Log View, produced before rendering so terminal and browser interfaces can share filtering, grouping, and status classification rules.
_Avoid_: Ink component state as the source of telemetry truth, browser-only UI model, raw OpenTelemetry export.

**Devtools UI Component**:
A focused React component that renders one part of a Developer Log View from a Devtools View Model.
_Avoid_: Monolithic terminal screen component, formatting embedded in telemetry ingestion, one-off string builder UI.

**Telemetry Store**:
The devtools Service-owned local persistence for captured OpenTelemetry data used to build Developer Log Views.
_Avoid_: Runner-owned log file, Raw Service Log, production observability backend.

**Best-Effort Telemetry Export**:
The rule that Services attempt to emit local telemetry without making devtools availability part of their startup or serving requirements.
_Avoid_: Telemetry-gated startup, runner fallback orchestration, devtools as a required dependency.

**Call Edge**:
A rendered parent-child relationship in a Developer Log View showing one operation causing another operation, usually one caller service invoking one callee service operation.
_Avoid_: Isolated request log line, network packet, shared request ID.

**Frontend API Adapter**:
A frontend-owned boundary that exposes UI-friendly operations and delegates to the oRPC client in production. Tests and stories can replace it with a fake implementation without running Identity, Better Auth, or service databases.
_Avoid_: Raw oRPC calls in components, mocking backend internals in frontend tests.

**Frontend Component**:
A UI unit with a focused rendering or interaction responsibility. Each component should live in its own file when splitting it out makes the call sites and tests easier to read.
_Avoid_: Large page components that mix unrelated UI sections, API state, and event handling in one file.

**Version Adapter**:
A service-edge adapter that maps one Contract Surface version's transport shapes to and from the service's current application use cases.
_Avoid_: Version branching in domain logic, contract-shaped application core.

**Auth Provider Adapter**:
An Identity service boundary around an authentication library such as Better Auth. It lets Identity use the library without spreading library-specific types and APIs throughout the service.
_Avoid_: Better Auth as domain model, library-shaped service core.

**Dummy Auth Provider**:
An Auth Provider Adapter for local development and tests that stores persistent principals but provides no meaningful credential security. It lets callers sign in as existing dummy principals, and it never creates principals implicitly during sign-in.
_Avoid_: Stateless subject assertion, production auth, auto-created typo accounts.

**Dummy Demo Account**:
A normal persisted dummy principal that is seeded for local development, such as Alice or Bob, and may be shown by the frontend as a one-click sign-in option when the UI shortcut flag is enabled.
_Avoid_: Special virtual user, token fixture, hard-coded frontend account.

**Browser Session**:
An Identity-owned session credential, normally carried by browser cookies, that proves the browser has signed in without exposing Megiddo service tokens to frontend code.
_Avoid_: Service token, frontend-held identity token, Todo authorization token.

**Use Case**:
A service-owned application operation that coordinates domain rules and infrastructure ports without depending on oRPC, HTTP, or a specific contract version.
_Avoid_: Handler, controller, endpoint implementation.

**Service Client Port**:
A caller-owned interface for invoking another service, with production implementations backed by oRPC contracts and tests backed by fakes.
_Avoid_: Raw oRPC client in use cases, imported service implementation.

**Completed Todo**:
A todo item marked as done. It cannot be renamed unless it is reopened first.
_Avoid_: Done item, finished task.

**Todo Owner**:
The user who owns a todo item. Only the owner can see or change that todo.
_Avoid_: Collaborator, assignee, shared user.

**Contract**:
A public oRPC boundary definition between services or between a client and a service.
_Avoid_: Internal service API, shared domain model.

**Contract Surface**:
A separately versioned contract for one caller relationship, such as `apiGatewayContract`, `todoContract`, or `identityContract`.
_Avoid_: Global contract object, shared endpoint registry.

**Contract Builder**:
A versioned helper used to define repeated contract shapes, such as CRUD procedures from a Resource Schema. Because changing a Contract Builder can change every Contract Surface that uses it, it is treated as part of the contract versioning model.
_Avoid_: Unversioned contract utility, invisible endpoint generator.

**Resource Schema**:
A contract-owned schema for an object shape that crosses an oRPC boundary, such as `UserResourceSchema` or `TodoResourceSchema`. It may resemble a service's domain model at first, but it is versioned and evolved as part of the contract rather than owned by the service implementation.
_Avoid_: DTO, domain schema, database schema, entity, transport schema.

**Resource Schema Version**:
A versioned public object shape, such as `UserResourceSchemaV1`, that can be reused across Contract Surfaces without forcing those surfaces to evolve together.
_Avoid_: Surface-local resource shape when the same public object is shared deliberately.

**Domain Model**:
A service-owned representation of the concepts and rules inside that service boundary.
_Avoid_: DTO, resource schema, shared model.
