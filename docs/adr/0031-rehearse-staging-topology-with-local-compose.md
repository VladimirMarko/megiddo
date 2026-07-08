# Rehearse Staging Topology With Local Compose

The deployment work must include a local `compose.yaml` that rehearses the staging topology before pushing to Fly.io. Its purpose is to exercise container builds, service separation, internal networking, mounted persistence, frontend-to-API configuration, and production-mode Identity settings in a repeatable local environment. This compose setup is not merely a minimal smoke-test helper; it is the local deployment rehearsal for the cloud topology and should be documented as such.
