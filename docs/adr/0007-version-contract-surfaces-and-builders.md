# Version Contract Surfaces And Builders

Contract Surfaces such as `identity`, `todo`, and `api-gateway` version independently; the workspace package version is not the architectural API version. Reusable Contract Builders, such as helpers that derive CRUD procedures from Resource Schemas, are also versioned inputs because changing a builder can change a contract even when the surface's immediate source code did not change.
