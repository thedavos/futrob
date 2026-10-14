# `@futrob/api-contracts`

Schemas Zod y OpenAPI del transporte HTTP privado `/api/v1`.

- Sin dominio hexagonal.
- Sin clientes HTTP de producto (los SDKs viven aparte).
- Sin Postgres / Wrangler.
- Sin shapes de EA Clubs (esas viven en el adapter).

```bash
npm run generate:openapi
```

The generator lives in `apps/api` (`@hono/zod-openapi` over the Zod schemas in this
package) and writes [`/packages/api-contracts/openapi`](/packages/api-contracts/openapi).
CI runs `npm run openapi:check` so those artifacts cannot drift.

Served at runtime: `/api/v1/openapi.json` and `/api/v1/openapi.yaml`.

Ver guía: [`/packages/README.md`](/packages/README.md).
