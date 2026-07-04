# Version Contract Builders By Contract-Visible Concern

Contract Builders are versioned by the contract-visible concern they define, such as CRUD shape, pagination semantics, authentication metadata, or standard error shape. A single global `builders/v1` module is too coarse because one changed builder would force unrelated re-exports, while versioning every private helper is too noisy; only directly imported builders whose changes can alter the public oRPC shape need explicit versions.
