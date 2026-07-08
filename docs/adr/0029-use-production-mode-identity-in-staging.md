# Use Production-Mode Identity In Staging

The production-shaped staging deployment uses Better Auth and JWT/JWS Identity Tokens rather than dummy auth or dummy token codecs. This makes staging exercise the same browser session, signing-key, and token-verification paths expected in production, with signing material and internal service secrets supplied through the deployment platform's secret store. The tradeoff is a heavier first deployment setup, but it prevents a staging environment that succeeds only because local-development auth shortcuts are still enabled.
