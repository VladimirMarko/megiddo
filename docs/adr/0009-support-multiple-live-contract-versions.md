# Support Multiple Live Contract Versions

Published Contract Surface versions can coexist at runtime, such as `identity/v1` and `identity/v2` being served by the same Identity service process. This makes the append-only contract policy enforceable in running services rather than only preserving old source files for examples or tests.
