# Megiddo

Megiddo is a TypeScript Turborepo for demonstrating clean architecture across independently runnable example services.

## Language

**Service**:
A separately runnable process with its own package boundary and persistence boundary.
_Avoid_: Microservice as a mere folder boundary or module namespace.

**API Gateway**:
A service that exposes the collated public API surface to the frontend and composes calls to backend services through their contracts.
_Avoid_: Frontend server, shared backend, direct service aggregation in the browser.

**Frontend Procedure**:
An API Gateway procedure shaped around a frontend use case, often composed from multiple backend service calls.
_Avoid_: Re-exported service procedure, raw backend endpoint.

**Service Ownership**:
The rule that a service is the source of truth for the data and rules inside its boundary. Other services refer to that data through stable identifiers or contract calls rather than copying ownership.
_Avoid_: Shared ownership, shared database, cross-service entity reuse.

**User Reference**:
A stable identifier for a user owned by the Identity service and stored by another service when it needs to associate data with that user.
_Avoid_: Copied user profile, embedded user entity.

**Identity Token**:
A signed credential issued by the Identity service that lets another service verify the authenticated user without calling Identity for every request.
_Avoid_: API session, shared secret, database lookup.

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

**Frontend API Adapter**:
A frontend-owned boundary that exposes UI-friendly operations and delegates to the oRPC client in production. Tests and stories can replace it with a fake implementation without running Identity, Better Auth, or service databases.
_Avoid_: Raw oRPC calls in components, mocking backend internals in frontend tests.

**Version Adapter**:
A service-edge adapter that maps one Contract Surface version's transport shapes to and from the service's current application use cases.
_Avoid_: Version branching in domain logic, contract-shaped application core.

**Auth Provider Adapter**:
An Identity service boundary around an authentication library such as Better Auth. It lets Identity use the library without spreading library-specific types and APIs throughout the service.
_Avoid_: Better Auth as domain model, library-shaped service core.

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
