# Transporte y recuperación

La implementación vigente está en `packages/sdk/src/http.ts` y `errors.ts`.
Revisarla al cambiar comportamiento del transporte; esta referencia explica
sus consecuencias para consumidores.

## Configuración

`createFutrobClient` acepta `baseUrl`, `getAccessToken`, `getExtraHeaders`,
`fetchImpl`, `timeoutMs` y `maxRetries`.

- `baseUrl` incluye `/api/v1`; los métodos añaden sus rutas relativas.
- `getAccessToken` devuelve el token sin el prefijo `Bearer`; el SDK lo añade.
  Leer la sesión actual mediante la fábrica del entorno evita capturar un token
  obsoleto en un cliente de larga vida.
- `getExtraHeaders` sirve para integración confiable y correlación. No usarlo
  para fabricar una identidad desde datos de UI.
- `fetchImpl` permite adaptar el límite del entorno y probar sin red. Una envoltura
  debe conservar `init`, señal y headers, y no registrar credenciales.
- El SDK no configura `credentials: "include"` ni resuelve CORS. Si el recorrido
  depende de cookies entre orígenes, comprobar la arquitectura y el transporte de
  la app en vez de asumir que la instancia genérica autentica la petición.

Los métodos admiten `RequestOptions` como último argumento: `signal`, `timeoutMs`,
`maxRetries` y `headers`. Verificar las posiciones en el recurso concreto.

## Cancelación y respuestas obsoletas

```ts
import type { FutrobClient } from "@futrob/sdk";

export function startClubSearch(client: FutrobClient, query: string) {
  const controller = new AbortController();
  const result = client.gameData.clubs.search(
    { query },
    { signal: controller.signal, timeoutMs: 5_000, maxRetries: 0 },
  );
  return { result, cancel: () => controller.abort() };
}
```

El caller debe consumir `result` y manejar su rechazo, incluso si cancela. En UI,
abortar al desmontar o al cambiar la consulta y descartar resultados de una
generación anterior. La cancelación no garantiza que una mutación ya recibida
por el servidor haya sido revertida.

No tratar `AbortError` como fallo que exige un toast o reintento cuando la app lo
provocó voluntariamente. Si se usa un motivo de cancelación personalizado,
comprobar también la señal: el error propagado puede ser ese motivo.

## Errores

Capturar `unknown` y discriminar sin convertir todos los fallos en `FutrobApiError`:

| Tipo o condición | Significado y respuesta del consumidor |
| --- | --- |
| `FutrobApiError` | Respuesta HTTP no exitosa; usar `status`, `code`, `messageKey` y metadata |
| `FutrobRequestTimeoutError` | Venció el timeout configurado; mostrar recuperación sin asumir que una escritura no ocurrió |
| Error de abort/señal abortada | Cancelación; normalmente descartar trabajo obsoleto |
| Error de red/transporte | No hay respuesta HTTP utilizable; tratar según el wrapper del entorno |
| Error de schema Zod | Input incompatible o respuesta que rompe el contrato; no convertirlo en vacío ni ocultarlo con un cast |

`FutrobApiError.message` contiene `messageKey`, no copy listo para mostrar. Traducir
por `code`/`messageKey` con el mecanismo existente y mantener un fallback seguro.
El código estable identifica un fallo; comparar mensajes literales del servidor
es frágil. `details` puede ayudar a señalar campos, pero no se expone entero sin
revisar su contrato y contenido.

| Estado | Manejo habitual |
| --- | --- |
| 401 | Aplicar el ciclo de sesión del consumidor; impedir acceso protegido y ofrecer autenticación |
| 403 | Mantener denegación; no cambiar de actor ni de contexto para evadirla |
| 404 | Mostrar ausencia solo si el recurso define ese significado; puede ser un contexto inválido |
| 409 / validación | Resolver el conflicto de negocio por código, conservando entradas recuperables |
| 429 | Respetar la política de espera y `retryAfterSeconds` disponible; evitar bucles de reintento |
| 5xx / red | Mostrar recuperación explícita; conservar el contexto y evitar duplicar mutaciones |

Si el cuerpo HTTP no cumple `apiErrorSchema`, el SDK genera `code: "sdk.http_error"`
y `messageKey: "errors.http"`. No asumir que todas las respuestas de proxies
contienen errores JSON de Futrob.

El BFF puede mapear red a `ProductApiUnreachableError`; los clientes web históricos
pueden tener clases propias. Usar los clasificadores de ese límite y no asumir
que todos los errores de red son `TypeError` en cualquier consumidor.

## Reintentos: semántica real

Los reintentos y timeouts están desactivados por defecto.

- `maxRetries` a nivel de cliente solo habilita reintentos de GET, PUT y DELETE.
- Un `maxRetries` explícito por request puede habilitar también POST y PATCH.
  No hacerlo para crear organizaciones, aceptar invitaciones, completar onboarding
  u otras mutaciones sin comprobar idempotencia/reconciliación del caso de uso.
- Los intentos elegibles reintentan errores de red y estados 408, 429 y 5xx.
  Abortos no se reintentan; el timeout produce `FutrobRequestTimeoutError` sin
  pasar por el reintento de red del transporte actual.
- El timeout es por intento, no un presupuesto total del flujo. No presentarlo
  como garantía de duración total de varias llamadas.
- `Retry-After` se interpreta actualmente como entero positivo de segundos.
  No se parsean fechas HTTP. El delay basado en ese valor se limita a 15 segundos;
  si falta, se usa backoff con jitter. Revisar el código antes de prometer un
  respeto ilimitado de la espera que exige el servidor.
- `retryAfterSeconds` del error puede venir del cuerpo o del header en errores
  estructurados. No asumir que existe en el fallback `sdk.http_error`.

Ante una respuesta perdida después de una escritura, distinguir “no se recibió
confirmación” de “no se realizó”. Consultar el estado o usar la garantía existente
de idempotencia antes de repetir. No añadir headers de idempotencia sin soporte
real del endpoint. No multiplicar silenciosamente los intentos con retries de UI.

## Correlación

El SDK añade `X-Request-Id` cuando no hay uno explícito y recupera el identificador
de errores estructurados o del header válido. Usar `REQUEST_ID_HEADER` desde
`@futrob/api-contracts` en integraciones para conservar la correlación entrante.

El identificador de request **no es una clave de idempotencia**. El transporte
construye headers en cada intento; no asumir que una UUID generada internamente
identifica todos los intentos de una operación. El BFF existente propaga la suya.

Los headers adicionales del request se combinan con los del cliente, pero el
transporte construye sus propios headers de autorización, cuerpo y correlación.
Evitar variantes de capitalización duplicadas del mismo header. No usar headers
por request como sustituto de la fábrica autenticada del entorno.
