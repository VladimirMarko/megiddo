# Use API Gateway For Frontend API Surface

The frontend talks to a separately runnable API Gateway service rather than calling every backend service directly. The API Gateway exposes the collated oRPC API surface and composes calls to services such as `todo` and `identity`, giving the architecture a clear place for session handling, inter-service communication, and frontend-focused test doubles.
