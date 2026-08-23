# @futrob/sdk

Cliente HTTP tipado (estilo Stainless) para la API privada Futrob (`/api/v1`).

```ts
import { createFutrobClient } from "@futrob/sdk";

const futrob = createFutrobClient({
  baseUrl: "https://app.example.com/api/v1",
  getAccessToken: async () => token,
});

await futrob.meta.ping();
await futrob.gameData.clubs.search({ query: "Fera" });
await futrob.gameData.clubs.retrieve("10754");
await futrob.gameData.clubs.matches("10754", { matchType: "friendlyMatch" });
```

Depende solo de `@futrob/api-contracts`. No importa módulos de `apps/web`. No llama a EA.

El mismo cliente TypeScript cubre `apps/web` y `apps/mobile`, ambas superficies del MVP. La app nativa usa React Native + Expo; no hay SDK Dart/Flutter.

## Timeouts, reintentos y cancelación

Por defecto el cliente no aplica timeout ni reintentos (compatibilidad con el comportamiento
histórico). Todo es opt-in:

```ts
const futrob = createFutrobClient({
  baseUrl: "https://app.example.com/api/v1",
  timeoutMs: 15_000, // por intento; desactivado si se omite
  maxRetries: 2, // solo verbos idempotentes (GET/PUT/DELETE); 0 si se omite
});

// Por request: señal, timeout, reintentos (incluye POST/PATCH si se pide explícito) y headers.
await futrob.gameData.clubs.search(
  { query: "Fera" },
  {
    signal: controller.signal,
    timeoutMs: 5_000,
    maxRetries: 1,
    headers: { "X-Trace": "portal" },
  },
);
```

Los reintentos cubren errores de red y respuestas `408`/`429`/`5xx`, respetando `Retry-After`
(con backoff exponencial acotado a 15 s). Un request abortado nunca se reintenta y lanza el
error de abort; un timeout lanza `FutrobRequestTimeoutError`.

## Namespaces anidados en `teams`

La superficie plana histórica (`client.teams.addToRoster(...)`, etc.) sigue funcionando.
Los mismos endpoints viven también agrupados:

- `client.teams.players` — `/players/me/*`
- `client.teams.rosters` — roster por equipo/competición
- `client.teams.rosterInvitations` — crear/aceptar invitaciones de roster
- `client.teams.externalClubs` — vínculo EA del equipo

## Testing

Utilidades para tests disponibles como subpath público:

```ts
import { mockFetch, requestUrl, parseMockJsonBody } from "@futrob/sdk/testing";
```

Guía general: [`/packages/README.md`](/packages/README.md).
