# Use Frontend API Adapter Above oRPC

The oRPC contracts define the network boundary, but frontend components depend on a frontend-owned API adapter instead of raw oRPC calls. The production adapter delegates to the API Gateway oRPC client, while tests and stories can use fake adapters for logged-in, logged-out, and error states without running Identity, Better Auth, or service databases.
