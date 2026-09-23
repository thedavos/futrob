# Consumo por entorno

## Elegir la fábrica y el host

Reutilizar estas integraciones antes de crear otra instancia/configuración:

| Consumidor | Implementación existente | Autenticación y origen |
| --- | --- | --- |
| Móvil Expo | `apps/mobile/src/modules/api/futrob-client.ts` | Lee Bearer desde SecureStore mediante `getSession`; añade `/api/v1` a `API_BASE_URL` |
| BFF/SSR web | `apps/web/src/context/create-authenticated-product-api-client.ts` | Resuelve actor desde sesión confiable y construye el cliente de producto por request |
| BFF → API | `apps/web/src/context/product-api-client.ts` | Secret de servicio, actor confiable y correlación; URL configurada con `/api/v1` |
| Navegador | `apps/web/src/shared/infrastructure/http/futrob-browser-client.ts` y clientes de cada módulo | La fábrica genérica no configura credenciales; revisar el BFF y la ruta existente |
| CLI | `apps/cli/src/lib/futrob-client.ts` | Configura token y actor; `apiCall` integra la promesa en `Effect` |

**No confundir orígenes.** Las rutas protegidas de `apps/api` que usan
`createServiceAuthMiddleware` requieren secreto de servicio y actor confiable.
Un token Better Auth de usuario no reemplaza ese secreto. En móvil, comprobar que
el origen configurado expone el BFF `/api/v1` que valida esa sesión. No cambiarlo
directamente a `:8787` solo porque ambos hosts tienen rutas con el mismo prefijo.

Para diagnosticar un 401, seguir la cadena completa: cliente → host configurado →
ruta BFF, si existe → sesión/actor → cliente de servidor → API. No resolverlo
inyectando secretos de servidor en variables `VITE_*` o `EXPO_PUBLIC_*`.

### Web: código existente y migraciones

Web también tiene clientes de módulo basados en `requestBrowserJson`, por ejemplo
`identity-browser-client.ts`, que llaman al BFF del mismo origen y exponen sus
propias clases de error. Su existencia no implica que un cliente SDK genérico
apuntado a la API Node tenga la misma autenticación.

Al añadir consumo nuevo, preferir el SDK donde el método, la ruta y el transporte
sean compatibles. Si la tarea migra uno de esos clientes al SDK, conservar el
recorrido por el BFF, la sesión, el mapeo de errores y la invalidación de queries.
No migrar todos los módulos como efecto colateral de una llamada nueva.

### Ejemplo móvil

Este código pertenece a `apps/mobile`; el alias `@/` es el de esa app:

```ts
import { getFutrobClient } from "@/modules/api/futrob-client";

const client = getFutrobClient();
const { profile, gameAccounts, externalClubs } = await client.players.getProfile();
```

El cliente móvil actual centraliza la limpieza de sesión ante 401 en `fetchImpl`.
El SDK compartido no la hace. Usar los guards y manejadores de sesión de la app
para impedir que un 401 deje contenido protegido visible. Un 403 no equivale a
sesión expirada ni habilita una ruta de fallback con permisos más amplios.

### Ejemplo BFF

Dentro de un handler web que recibe un `Request` autenticable:

```ts
import { createAuthenticatedProductApiClient } from "@/context/create-authenticated-product-api-client";

export async function readMemberships(request: Request) {
  const { client } = await createAuthenticatedProductApiClient(request);
  return client.organizations.listMine();
}
```

Conservar en el handler real el mapeo de respuestas/errores y correlación del módulo.
No almacenar ese cliente en un singleton global: lleva la identidad del request.
No importar esta fábrica de servidor desde un componente de navegador.

## Contratos y estado del consumidor

- Leer la firma completa: los argumentos de negocio preceden a `RequestOptions`.
  Por ejemplo `clubs.retrieve(id, input, options)` necesita `{}` como segundo
  argumento si solo se quiere configurar la señal.
- El SDK parsea entradas donde el recurso lo define y parsea respuestas con los
  schemas wire. La UI puede validar antes para mostrar errores de campo, pero
  no sustituye ni redefine la validación del contrato.
- Usar las query keys y hooks existentes en web. Incluir los IDs del contexto y
  filtros que cambian el resultado. Limpiar o invalidar datos al cambiar de actor
  para no reutilizar caché de otra sesión.
- Reutilizar la solución de estado de móvil; no introducir TanStack Query solo
  porque el consumidor web lo use. El SDK no requiere un framework de UI.
- Tras mutaciones, actualizar/invalidar la entidad y sus listados afectados.
  Si cambian membresías, roles, grants, invitaciones aceptadas o contexto activo,
  renovar también permisos y destinos que dependan de ellos.
- No reintentar automáticamente una mutación tanto en el SDK como en la capa de
  queries. Seleccionar conscientemente una política y considerar el total de intentos.

## EffectiveAccess

Consultar solo los permisos necesarios, con el scope real de la acción:

```ts
import type { FutrobClient } from "@futrob/sdk";
import type { AuthorizationScopeDto } from "@futrob/api-contracts";

export async function canManageRoster(
  client: FutrobClient,
  scope: AuthorizationScopeDto,
  signal?: AbortSignal,
): Promise<boolean> {
  const access = await client.authorization.getEffectiveAccess(
    scope,
    ["teams.roster.manage"],
    { signal },
  );
  return access.permissions.some(
    (entry) => entry.permission === "teams.roster.manage" && entry.allowed,
  );
}
```

El caller de ese ejemplo debe aportar los IDs de organización, competición y equipo
correspondientes; un scope vacío no sirve como decisión para administrar una plantilla.
Usar `encounterId` cuando la operación dependa de un encuentro. No combinar IDs de
contextos distintos ni inventar `scopeType` para `getEffectiveAccess`: su firma usa
`AuthorizationScopeDto` con IDs opcionales.

Durante carga, denegación o error, no mostrar acciones como permitidas. Una fila
ausente tampoco concede permiso. Descartar respuestas de un scope anterior si el
usuario cambia de contexto. La autorización del servidor sigue siendo obligatoria.

## Onboarding y aceptación de invitaciones

Cuando la tarea toque onboarding, conservar este orden:

1. Leer sesión con el mecanismo de la app.
2. Consultar `identity.getOnboardingStatus()`; `actor_onboarding` es la autoridad
   de camino, paso y finalización.
3. Si está incompleto, reanudar un paso válido para su camino. El borrador local
   contiene campos del formulario, no evidencia de finalización del servidor.
4. Si está completo, consultar `organizations.resolvePostAuthDestination()` y
   respetar la unión discriminada `destination`, sin deducir el destino por roles.

Usar las operaciones compuestas para finalizar:

| Camino | Método | Consecuencia/destino que debe consumir la app |
| --- | --- | --- |
| Jugador | `identity.completePlayerOnboarding` | Perfil/cuenta/club personal opcionales según contrato; destino personal |
| Organización | `identity.completeOrganizationOnboarding` | Organización y primera competición draft; IDs de `destination` para setup |
| Invitación | `identity.completeInvitationOnboarding` | Aceptación y onboarding; IDs de competición devueltos por el servidor |

No reconstruir estas operaciones con una cadena de CRUD independientes, ni dar por
terminado el onboarding tras guardar solo el progreso. Navegar al siguiente paso
después de confirmar `saveOnboardingProgress` cuando el flujo exige persistencia.

Inspeccionar tokens con `identity.inspectCompetitionInvitation`, invalidar el preview
al editar el token y descartar respuestas viejas. Para actores ya incorporados,
usar la aceptación que corresponda a la clase de invitación existente. No confundir
invitaciones de organización/competición con `teams.rosterInvitations`.

Las asociaciones personales de `players.associateExternalClub` y los vínculos de
equipo de `teams.externalClubs` tienen efectos distintos. Una selección de club EA
en onboarding personal no autoriza a enlazar ni administrar un equipo.
