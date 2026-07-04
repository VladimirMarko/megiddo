# Use Contract Smoke Tests For Runtime Conformance

oRPC TypeScript types are the first line of contract conformance, but each live Contract Surface version also gets thin contract smoke tests. These tests cover runtime routing, schema validation, auth and error mapping, and representative success/error procedures rather than exhaustively duplicating compile-time type checks.
