# Use Embedded Local Persistence Behind Adapters

Services that need durable storage use SQLite-compatible embedded persistence for local development, hidden behind service-owned persistence adapters. This keeps Sandcastle development free from Docker Compose or networked database dependencies while preserving a path to swap in a normal deployment database later.
