# Use best-effort local telemetry export

Services should emit local OpenTelemetry data on a best-effort basis. The local runner may inject standard OpenTelemetry configuration and explicit service names, but devtools availability must not gate Service startup or normal serving. If devtools or OTLP ingestion is unavailable, Services continue to run; the Developer Log View simply has missing telemetry until ingestion is available again.

This keeps `scripts/run-local-dev.mts` as topology wiring rather than a brittle orchestrator that detects devtools failures, rewrites startup behavior, or decides whether telemetry should be skipped.
