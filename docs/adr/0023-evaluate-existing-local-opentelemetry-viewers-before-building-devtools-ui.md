# Evaluate existing local OpenTelemetry viewers before building a devtools UI

Megiddo should not build a custom local telemetry viewer until existing local OpenTelemetry viewers have been evaluated against real repository traces. The first PRD should require a spike comparing lightweight candidates such as `otel-gui`, Aspire Dashboard standalone, and `otel-desktop-viewer` before committing to a Megiddo-specific TUI or browser UI.

This keeps the project aligned with proven tooling where possible. A custom Developer Log View remains an option only if existing viewers cannot show the local service-call and failure flow needed for Megiddo development.
