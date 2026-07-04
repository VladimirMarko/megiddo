# Use Real Service Processes In Dev And Fakes In Focused Tests

Normal local development runs services as separate processes communicating over localhost so package and service boundaries are exercised. Focused unit and component tests may use in-process fakes or contract-compatible adapters, while integration tests cover representative real oRPC paths such as `api -> todo` and `api -> identity`.
