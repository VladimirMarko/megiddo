# Start Tracer Bullet With In-Memory Repositories

The tracer bullet starts with in-memory repositories behind Persistence Adapters rather than real embedded persistence. This keeps the first slice focused on topology, contracts, process boundaries, token seams, and frontend integration; SQLite-compatible persistence is added in the next slice by swapping adapter implementations.
