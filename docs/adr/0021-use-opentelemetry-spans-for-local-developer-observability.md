# Use OpenTelemetry spans for local developer observability

Developer observability should render local service activity without inventing a Megiddo-specific message hash or call-pairing protocol. We will model oRPC client calls and server handlers as OpenTelemetry spans, using standard trace and parent-child span relationships to build the Developer Log View. The first implementation may remain local and lightweight, but its vocabulary and data shape should align with OpenTelemetry so it can grow into standard tooling later.
