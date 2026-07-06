# Local OpenTelemetry viewer evaluation

Issue: #25. Parent PRD: #20.

Known Megiddo trace: `docs/reports/evidence/known-megiddo-trace.otlp.json`.

The fixture is an OTLP/HTTP JSON trace for one API Gateway to Todo oRPC call. It contains `api-gateway` and `todo` resource spans, `orpc.client v1.todos.create`, `orpc.server v1.todos.create`, shared trace id `11111111111111111111111111111111`, and the server span parented to the client span. It mirrors the behavior proven by `tests/orpc-telemetry.test.ts` without depending on subjective UI review.

Sender command used for every candidate:

```sh
node --import tsx scripts/send-known-otlp-trace.mts
```

The sender posts the fixture to `http://localhost:4318/v1/traces` unless a different endpoint argument is supplied.

## otel-gui

Install or startup command:

```sh
gh release download v2.0.0 --repo metafab/otel-gui --pattern otel-gui-linux-x64.tar.gz --dir /tmp/opencode/otel-viewers/otel-gui
tar -xzf /tmp/opencode/otel-viewers/otel-gui/otel-gui-linux-x64.tar.gz -C /tmp/opencode/otel-viewers/otel-gui
PORT=4318 /tmp/opencode/otel-viewers/otel-gui/otel-gui-linux-x64/otel-gui
```

Receive OTLP HTTP traces on localhost:4318: yes. No extra configuration was needed beyond keeping the default `PORT=4318`.

Startup evidence:

```text
Listening on http://0.0.0.0:4318
```

Ingestion evidence:

- `docs/reports/evidence/otel-gui-send.json` records `status: 200` from `POST http://localhost:4318/v1/traces`.
- `docs/reports/evidence/otel-gui-api-traces.json` records `GET http://localhost:4318/api/traces` returning trace id `11111111111111111111111111111111`, root span `orpc.client v1.todos.create`, and `spanCount: 2`.

Failure: none in Sandcastle for the release binary path.

## Aspire Dashboard standalone

Install or startup command:

```sh
npx -y @microsoft/aspire-cli dashboard run --allow-anonymous
```

Receive OTLP HTTP traces on localhost:4318: yes. `--allow-anonymous` was used so the CLI query could verify ingestion without a browser token. Startup output showed:

```text
Dashboard:  http://localhost:18888
OTLP/gRPC:  http://localhost:4317
OTLP/HTTP:  http://localhost:4318
```

Ingestion evidence:

- `docs/reports/evidence/aspire-send.json` records `status: 200` from `POST http://localhost:4318/v1/traces`.
- `docs/reports/evidence/aspire-traces.txt` records `npx -y @microsoft/aspire-cli otel traces --dashboard-url http://localhost:18888` returning one trace named `api-gateway: orpc.client v1.todos.create`, with `Spans` equal to `2`, `Duration` equal to `40ms`, and status `OK`.

Failure: none for the `npx` path. Docker and raw `dotnet` paths were not usable in this Sandcastle image because `docker` and `dotnet` are not installed.

## otel-desktop-viewer

Install or startup command:

```sh
gh release download v0.3.2 --repo CtrlSpice/otel-desktop-viewer --pattern otel-desktop-viewer_linux_amd64.tar.gz --dir /tmp/opencode/otel-viewers/otel-desktop-viewer
tar -xzf /tmp/opencode/otel-viewers/otel-desktop-viewer/otel-desktop-viewer_linux_amd64.tar.gz -C /tmp/opencode/otel-viewers/otel-desktop-viewer
/tmp/opencode/otel-viewers/otel-desktop-viewer/otel-desktop-viewer --open-browser=false --db /tmp/opencode/otel-viewers/otel-desktop-viewer/megiddo.duckdb
```

Receive OTLP HTTP traces on localhost:4318: not verified in Sandcastle because the binary did not start.

Ingestion evidence: unavailable. `docs/reports/evidence/otel-desktop-viewer-run.log` records the startup failure before any OTLP receiver was available.

Failure:

```text
/tmp/opencode/otel-viewers/otel-desktop-viewer/otel-desktop-viewer: /lib/x86_64-linux-gnu/libm.so.6: version `GLIBC_2.38' not found
```

The upstream README also warns that Linux release binaries require newer glibc than some environments provide. Do not select this as the default for Sandcastle until the runtime image or install path changes.

## otel-tui

Install or startup command:

```sh
gh release download v0.7.3 --repo ymtdzzz/otel-tui --pattern otel-tui_Linux_x86_64.tar.gz --dir /tmp/opencode/otel-viewers/otel-tui
tar -xzf /tmp/opencode/otel-viewers/otel-tui/otel-tui_Linux_x86_64.tar.gz -C /tmp/opencode/otel-viewers/otel-tui
TERM=xterm /tmp/opencode/otel-viewers/otel-tui/otel-tui --debug-log
```

Receive OTLP HTTP traces on localhost:4318: yes for the receiver path. The process log showed an OTLP HTTP receiver on `[::]:4318`, and the sender returned HTTP 200.

Ingestion evidence:

- `docs/reports/evidence/otel-tui-send.json` records `status: 200` from `POST http://localhost:4318/v1/traces` with `partialSuccess` in the OTLP response body.
- `docs/reports/evidence/otel-tui-debug-log.txt` records the receiver startup on `[::]:4318`.

Failure: the TUI cannot be checked end-to-end in non-interactive Sandcastle because it tries to open `/dev/tty` and logs `error running tui app: open /dev/tty: no such device or address`. Treat it as a terminal fallback for a real developer terminal, not the default machine-checkable viewer.

## Machine-checkable proof

The strongest proof came from candidates with queryable trace data after ingestion:

- `otel-gui`: `GET /api/traces` returned the known Megiddo trace id, root span, and `spanCount: 2`.
- Aspire Dashboard standalone: `aspire otel traces` returned the known Megiddo trace with two spans and status `OK`.
- `otel-tui`: the OTLP receiver accepted the trace, but there is no non-interactive query API in this evaluation.
- `otel-desktop-viewer`: no proof because startup failed before ingestion.

## Recommendation

Select `otel-gui` as the default local viewer for the next Megiddo telemetry iteration.

Reasons:

- It starts from a Linux release binary in Sandcastle.
- It receives OTLP HTTP JSON traces on the PRD default endpoint, `localhost:4318`, with no extra telemetry configuration.
- It exposes machine-checkable trace data at `GET /api/traces`, which makes future agent verification straightforward.
- It is local, lightweight, and does not require Docker, `dotnet`, auth-token exchange, or a real TTY.

Aspire Dashboard standalone is a strong fallback if the team prefers Microsoft-maintained tooling or the `aspire otel` CLI query path. It worked with `npx` and provided excellent machine-checkable evidence, but `--allow-anonymous` is needed for frictionless local verification.

Do not select `otel-desktop-viewer` yet for Sandcastle because the current Linux release binary fails on the available glibc. Do not select `otel-tui` as the default because non-interactive verification cannot inspect the UI and the TUI path needs `/dev/tty`.

## Human UI review

A human should inspect `otel-gui` for UI fit before wiring a permanent `pnpm telemetry` command. Check whether the trace list, waterfall, service map, filtering, and span attribute panels make Megiddo's API Gateway to Todo oRPC call understandable without extra custom rendering. Also compare Aspire Dashboard's trace view if the team values its broader telemetry UI enough to accept the extra CLI/auth setup.
