# Make Contract Versions Runtime Addressable

Contract Surface versions are reflected in runtime routing or oRPC namespaces as well as TypeScript exports. Because multiple published versions can coexist in one service process, callers must be able to address a specific version at runtime rather than relying only on source-level versioned files.
