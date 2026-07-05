import { propagation, trace } from '@opentelemetry/api'

let isLocalTelemetryConfigured = false

export const configureLocalTelemetry = async () => {
  if (isLocalTelemetryConfigured || process.env.OTEL_TRACES_EXPORTER !== 'otlp') {
    return
  }

  isLocalTelemetryConfigured = true

  try {
    const [opentelemetryCore, otlpExporter, opentelemetryResources, traceSdk] = await Promise.all([
      import('@opentelemetry/core'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/sdk-trace-base'),
    ])
    const provider = new traceSdk.BasicTracerProvider({
      resource: opentelemetryResources.resourceFromAttributes({
        'service.name': process.env.OTEL_SERVICE_NAME ?? 'megiddo-service',
      }),
      spanProcessors: [new traceSdk.BatchSpanProcessor(new otlpExporter.OTLPTraceExporter())],
    })

    trace.setGlobalTracerProvider(provider)
    propagation.setGlobalPropagator(new opentelemetryCore.W3CTraceContextPropagator())

    process.once('exit', () => {
      void provider.shutdown().catch(() => undefined)
    })
  } catch {
    // Local telemetry is best-effort; missing or misconfigured SDK pieces must not stop services.
  }
}
