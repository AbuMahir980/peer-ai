# Kennel: architecture

A modular monolith in NestJS, on PostgreSQL through TypeORM.

| Module | Holds |
|--------|-------|
| bookings | Stays: dates, price and whether the deposit is paid |
| owners | Owners' accounts and contact details |
| payments | The payment provider's webhook, which marks deposits paid |
| updates | Staff's daily updates and photos |
| vet | The client for the vet records service, which confirms vaccinations |

Each module is used by the others only through what it exports. Signing in issues a JWT, checked by the auth guard. The database's structure comes from the migrations in `services/api/migrations`.
