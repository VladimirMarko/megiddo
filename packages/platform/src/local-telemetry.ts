import { propagation, trace } from '@opentelemetry/api'

let localTelemetryConfigured = false

export const configureLocalTelemetry = async () => {
  if (localTelemetryConfigured || process.env.OTEL_TRACES_EXPORTER !== 'otlp') {
    return
  }

  localTelemetryConfigured = true

  try {
    const [
      { W3CTraceContextPropagator },
      { OTLPTraceExporter },
      { resourceFromAttributes },
      { BasicTracerProvider, BatchSpanProcessor },
    ] = await Promise.all([
      import('@opentelemetry/core'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/sdk-trace-base'),
    ])
    const provider = new BasicTracerProvider({
      resource: resourceFromAttributes({ 'service.name': process.env.OTEL_SERVICE_NAME ?? 'megiddo-service' }),
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
    })

    trace.setGlobalTracerProvider(provider)
    propagation.setGlobalPropagator(new W3CTraceContextPropagator())

    process.once('exit', () => {
      void provider.shutdown().catch(() => undefined)
    })
  } catch {
    // Local telemetry is best-effort; missing or misconfigured SDK pieces must not stop services.
  }
}
