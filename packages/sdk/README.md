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

El mismo cliente TypeScript cubre `apps/web` y la app móvil post-MVP (React Native + Expo). No hay SDK Dart/Flutter.

Guía general: [`/packages/README.md`](/packages/README.md).
