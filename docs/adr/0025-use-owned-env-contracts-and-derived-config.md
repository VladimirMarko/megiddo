# Use Owned Env Contracts And Derived Config

Megiddo will use T3 Env to define declarative Env Contracts owned by each service or script instead of one global runtime env object. Service and Script Config objects may derive convenient values from those contracts, but application or script wiring remains responsible for deciding behavior. Cross-component collation is an Env Catalog concern for documentation and checks, not a runtime import surface.

Node services and scripts do not perform implicit `.env` loading. Their Env Contracts validate the runtime env object supplied by the launcher, and env values enter through shell exports, CI or process-manager configuration, explicit package-script invocation, or the local dev runner's child-process env injection. Service app construction must remain free of hidden env-file loading; process entrypoints may validate `process.env`, derive config, and construct real infrastructure, but they do not decide to read files.

Frontend Vite commands keep Vite's built-in `.env` loading because browser env handling is a separate build-tool concern. Frontend code still receives only explicitly wired public values, and browser-visible variables should use Vite's `VITE_` prefix rather than relying on Node `process.env` behavior.
