# `@futrob/api-contracts`

Schemas Zod y OpenAPI del transporte HTTP privado `/api/v1`.

- Sin dominio hexagonal.
- Sin clientes HTTP de producto (los SDKs viven aparte).
- Sin Postgres / Wrangler.
- Sin shapes de EA Clubs (esas viven en el adapter).

```bash
npm run generate:openapi -w @futrob/api-contracts
```

Artefactos: [`/packages/api-contracts/openapi`](/packages/api-contracts/openapi).

Servidos en runtime: `/api/v1/openapi.json` y `/api/v1/openapi.yaml`.

Ver guía: [`/packages/README.md`](/packages/README.md).
