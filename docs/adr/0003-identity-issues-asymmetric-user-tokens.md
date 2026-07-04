# Identity Issues Asymmetric User Tokens

The Identity service is the only issuer of user identity tokens, and backend services verify those tokens locally using public verification material rather than calling Identity on every request. This keeps authentication ownership in Identity, avoids a synchronous dependency for every service request, and prevents other services from forging user credentials.
