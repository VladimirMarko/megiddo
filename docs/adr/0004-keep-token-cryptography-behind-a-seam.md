# Keep Token Cryptography Behind A Seam

Token signing and verification live behind a narrow cryptography seam rather than being hard-coded throughout services. This lets the repository demonstrate asymmetric and post-quantum token schemes without making the whole architecture depend on one algorithm or library choice.
