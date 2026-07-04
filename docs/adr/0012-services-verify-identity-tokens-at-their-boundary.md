# Services Verify Identity Tokens At Their Boundary

Backend services verify raw Identity Tokens for user-scoped operations rather than trusting the API Gateway to pass a normalized user context. The API Gateway may verify tokens for its own procedures, but each independently runnable service enforces its own authorization boundary using the Identity-issued token.
