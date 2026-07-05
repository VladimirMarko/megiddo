# Use Real Service Processes In Dev And Fakes In Focused Tests

Normal local development runs services as separate processes communicating over localhost so package and service boundaries are exercised. Focused unit and component tests may use in-process fakes or contract-compatible adapters, while integration tests cover representative real oRPC paths such as `api -> todo` and `api -> identity`.

The root `pnpm dev` command is the supported full local topology. It starts Identity, Todo, API Gateway, and Frontend with one shared development Identity Token keypair. `pnpm dev:local` is an alias for the same topology. `pnpm dev:turbo` is a lower-level command for running package dev tasks through Turbo; it is not the authenticated app workflow unless the caller supplies matching token key environment variables and service URLs.
