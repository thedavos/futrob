# Extender y validar el SDK

## Determinar qué falta

Antes de crear un método, buscar en `packages/sdk/src/resources/` y `client.ts`.
Puede existir bajo un namespace anidado o como alias histórico. Confirmar la
ruta HTTP, el método, el scope, el schema y la audiencia del endpoint.

Si no existe el comportamiento en servidor, implementarlo en el BC/API propietario
con [futrob-hexagonal-module](../../futrob-hexagonal-module/SKILL.md). Añadir una
función SDK que llama una ruta inexistente no completa una funcionalidad.

## Cambio de extremo a extremo

Modificar solo las capas afectadas, en este orden de dependencia:

1. **Contrato wire:** schema y tipos en `packages/api-contracts/src/v1/<contexto>/`;
   mantener sus exports públicos. Revisar compatibilidad de optional/default/null,
   enums, fechas serializadas y envolturas de respuesta.
2. **Servidor, si cambia:** caso de uso/mapper/handler en sus propietarios;
   autenticación, autorización y pertenencia entre IDs se validan en servidor.
   Mantener la documentación OpenAPI existente cuando cambie la superficie HTTP.
3. **Recurso SDK:** añadir o ajustar el método en el recurso adecuado. Usar
   `HttpClient`, `RequestOptions`, schemas compartidos y tipos de retorno explícitos.
4. **Superficie pública:** si es un recurso nuevo, conectarlo en `client.ts` y
   exportar su tipo en `index.ts`. Un archivo de recurso sin wiring no aparece
   en `createFutrobClient()`.
5. **Consumidores afectados:** actualizar BFF y apps sin importar código de apps
   desde el SDK. Mantener destinos, errores y efectos de negocio reales.
6. **Pruebas y documentación:** verificar el contrato observable y actualizar
   `packages/sdk/README.md` si cambia el modo de uso, sin copiar allí cada firma.

Preservar aliases de compatibilidad salvo que la tarea autorice su retirada.
No añadir abstractions genéricas, generación de cliente o dependencias de runtime
solo para implementar un endpoint ordinario.

## Forma de un método

Ejemplo real del patrón de lectura, basado en `organizations.listMine`:

```ts
import {
  listMyMembershipsResponseSchema,
  type ListMyMembershipsResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

export function createOrganizationsResource(http: HttpClient) {
  return {
    async listMine(options: RequestOptions = {}): Promise<ListMyMembershipsResponse> {
      return http.request({
        path: "/organizations/mine",
        method: "GET",
        options,
        parse: (data) => listMyMembershipsResponseSchema.parse(data),
      });
    },
  };
}
```

Este fragmento muestra el patrón; no reemplazar el recurso existente por él.
Para una mutación, parsear `input` con el schema de request antes de pasar `body`
a `http.request`. El transporte serializa JSON; no hacer otro `JSON.stringify`.

- Pasar siempre `options` al transporte para no perder cancelación o configuración.
- Construir segmentos dinámicos con el helper interno `apiPath` del SDK; recibe
  IDs sin pre-encodear. Usar `URLSearchParams` para filtros y omitir `undefined`.
- No concatenar tokens/IDs sin escape ni concatenar `?`/`&` a mano cuando hay
  varios filtros opcionales.
- Respetar respuestas envueltas: `{ competitions }` no es un array directo.
  Usar el schema correcto en vez de `as ResponseDto`.
- Para 204, definir explícitamente `parse: () => undefined` o el comportamiento
  de ausencia del contrato. No asignar ese significado a cualquier cuerpo inválido.
- No capturar un `FutrobApiError` en el recurso para convertirlo en error genérico:
  el consumidor necesita su código y metadata.

## Pruebas de transporte y recursos

Usar Vitest desde `vite-plus/test` y las utilidades públicas
`mockFetch`, `requestUrl`, `parseMockJsonBody` de `@futrob/sdk/testing`.
Dentro del SDK, los tests vecinos también usan imports relativos internos.

Ejemplo ejecutable sin red para el contrato de persistencia del onboarding:

```ts
import { expect, it } from "vite-plus/test";
import { createFutrobClient } from "@futrob/sdk";
import { mockFetch, parseMockJsonBody, requestUrl } from "@futrob/sdk/testing";

it("guarda el paso y devuelve el estado parseado", async () => {
  const client = createFutrobClient({
    baseUrl: "https://example.test/api/v1",
    fetchImpl: mockFetch((input, init) => {
      expect(requestUrl(input)).toBe("https://example.test/api/v1/identity/onboarding");
      expect(init?.method).toBe("PATCH");
      expect(parseMockJsonBody(init)).toEqual({
        path: "player",
        currentStep: "game-account",
      });
      return Response.json({
        completed: false,
        completedAt: null,
        version: null,
        path: "player",
        currentStep: "game-account",
      });
    }),
  });

  const status = await client.identity.saveOnboardingProgress({
    path: "player",
    currentStep: "game-account",
  });
  expect(status.currentStep).toBe("game-account");
  expect(status.completed).toBe(false);
});
```

Elegir pruebas según el riesgo introducido:

| Cambio | Evidencia útil |
| --- | --- |
| Nuevo método/recurso | Método y URL, encoding de IDs, query/body, respuesta válida y wiring público |
| Validación | Input inválido rechazado antes del fetch; respuesta incompatible rechazada, sin cast |
| Permisos | Scope completo, filas allow/deny, error sin habilitar acciones, cambio de contexto |
| Transporte | Propagación de headers/señal, 401/403/429/5xx, red, timeout/abort, presupuesto de retries |
| Mutación de flujo | Una sola petición ante doble envío, efectos y destino devueltos, recuperación sin duplicar |
| Caché/sesión | Invalidación afectada, separación por actor/contexto y descarte de respuestas viejas |

No repetir toda la suite de `HttpClient` en cada recurso: probar la interacción
nueva y reutilizar los tests compartidos. Para timers y reintentos, seguir
`packages/sdk/src/http-options.test.ts`; evitar esperas reales largas y red externa.

## Comandos

Desde la raíz del repositorio, elegir los workspaces afectados:

```bash
./node_modules/.bin/vp test packages/sdk
npm run typecheck --workspace @futrob/sdk
npm run check
```

Si cambian contratos o handlers, añadir sus tests, por ejemplo:

```bash
./node_modules/.bin/vp test packages/api-contracts packages/sdk apps/api
```

Para consumidores, ejecutar su typecheck y pruebas focalizadas. Si cambia código
compartido que llega a Expo, comprobar el bundle nativo según el README móvil y
la plataforma afectada. Usar scripts locales; no asumir un `vp` global ni ejecutar
`npx vp`, que puede resolver otro paquete.

El smoke real de API/CLI usa [futrob-cli](../../futrob-cli/SKILL.md); la verificación
web usa [verify-futrob](../../verify-futrob/SKILL.md). Un `mockFetch` demuestra el
contrato cliente, no autentica contra Better Auth ni demuestra autorización,
persistencia, rollback o conectividad EA en producción.
