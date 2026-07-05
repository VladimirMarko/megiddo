# Use Frontend API Adapter Above oRPC

The oRPC contracts define the network boundary, but frontend components depend on a frontend-owned API adapter instead of raw oRPC calls. The production adapter delegates to the API Gateway oRPC client, while tests and stories can use fake adapters for logged-in, logged-out, and error states without running Identity, Better Auth, or service databases.

Frontend components should stay focused. Split a page into separate component files when a section has its own rendering branch, interaction state, or test surface. Keep contract resource mapping in the adapter layer; component files should receive frontend-owned models and callbacks.
