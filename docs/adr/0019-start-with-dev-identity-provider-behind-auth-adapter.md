# Start With Dev Identity Provider Behind Auth Adapter

The tracer bullet uses a fake development-only identity flow behind the Auth Provider Adapter instead of integrating Better Auth immediately. This proves service boundaries, token verification, and frontend testability first, while allowing Better Auth to replace the adapter later without reshaping API Gateway, Todo, or frontend tests.
