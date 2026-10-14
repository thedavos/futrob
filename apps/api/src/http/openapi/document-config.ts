export const OPENAPI_DOCUMENT_INFO = {
  openapi: "3.1.0",
  info: {
    title: "Futrob Private API",
    version: "0.1.0",
    description:
      "Private HTTP API for Futrob clients (web, React Native / Expo, scripts). Not a public third-party API.",
  },
  servers: [{ url: "/api/v1", description: "Same Worker as apps/web" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "meta", description: "Health and discovery" },
    {
      name: "game-data",
      description: "Provider observations (neutral DTOs; EA stays server-side)",
    },
    { name: "onboarding", description: "Actor onboarding state and path completion" },
    { name: "organizations", description: "Organizations and tenant memberships" },
    { name: "players", description: "Personal player profile and game accounts" },
    {
      name: "competitions",
      description:
        "Organization-scoped drafts and authenticated discovery of published competitions",
    },
    { name: "authorization", description: "Contextual roles, grants and effective access" },
    { name: "encounters", description: "Persisted encounter schedule read models" },
    { name: "fixtures", description: "Deterministic competition fixture graphs" },
    { name: "results", description: "Official match selection negotiated by the Encounter Teams" },
    { name: "notifications", description: "Activity feeds and pending work per audience" },
  ],
};

export const BEARER_AUTH_SCHEME = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Optional in MVP scaffold; required when identity is wired.",
} as const;

export const REQUEST_ID_PARAMETER = {
  name: "X-Request-ID",
  in: "header",
  required: false,
  description:
    "Optional caller-supplied UUID. Invalid values are replaced; the effective value is returned in the response.",
  schema: { type: "string", format: "uuid" },
} as const;

export const REQUEST_ID_HEADER = {
  description: "Correlation UUID for support and operational diagnostics.",
  schema: { type: "string", format: "uuid" },
} as const;

export const RETRY_AFTER_HEADER = {
  description: "Seconds until this rate-limited operation can be retried.",
  schema: { type: "integer", minimum: 1 },
} as const;
