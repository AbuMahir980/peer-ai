# Courier: architecture

```
browser ──> apps/web (React) ──HTTPS──> services/api (FastAPI) ──> PostgreSQL
                                              └──> geocoding service (third party)
```

- The web app talks to the API only through `services/api/openapi.json`, the contract.
- The API authenticates each request with a signed session token.
- Each route module owns one resource: parcels, payments.
- Database changes are SQL migrations in `services/api/migrations`, applied in order, and must never lose customer data.
