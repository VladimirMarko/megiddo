# Services Own Test And Dev Persistence Lifecycle

Each service owns its persistence lifecycle and storage configuration. Focused tests default to in-memory persistence, local development uses service-specific file-backed embedded persistence, and no service relies on a shared repo-wide database for normal development or tests.
