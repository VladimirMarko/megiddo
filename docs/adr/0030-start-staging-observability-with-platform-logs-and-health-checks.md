# Start Staging Observability With Platform Logs And Health Checks

The first production-shaped staging deployment uses platform logs and HTTP health checks rather than adding a hosted OpenTelemetry collector or dashboard. Megiddo's current telemetry path is designed for local developer observability and is best-effort, so promoting it to hosted staging observability would expand deployment scope before the service topology is proven. The tradeoff is weaker cross-service debugging during the first staging phase; hosted trace collection should be added after deployment basics are stable.
