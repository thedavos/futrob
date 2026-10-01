# Preparar los datos del player home móvil mediante el SDK

Entregar un loader TypeScript y un modelo puro que la futura pantalla móvil pueda consumir.
Cubrir las seis fuentes de la tarea [Player home móvil, datos vía SDK](https://www.notion.so/3dc7b204009a81458eeffbc873fbeae7).
Preparar una sola entrega de lógica y pruebas. Mantener la implementación de pantallas en su tarea UI.
Este documento es el plan. Las casillas de implementación y validación permanecen pendientes.

## Preparar el cambio mínimo

- [ ] Crear `apps/mobile/src/modules/player-home/load-player-home.ts`.
- [ ] Crear `apps/mobile/src/modules/player-home/player-home-model.ts`.
- [ ] Crear las pruebas colocadas junto a esos dos módulos.
- [ ] Importar DTOs desde `@futrob/api-contracts` y el cliente desde `@futrob/sdk`.
- [ ] Reutilizar `getFutrobClient()` para la configuración móvil de producción.
- [ ] Mantener los módulos independientes de React, Expo Router y componentes.
- [ ] Mantener las reglas de negocio, las rutas, los contratos HTTP y la persistencia en sus propietarios actuales.

El principio Laziness Protocol limita la entrega a esos módulos y sus pruebas.
No hace falta introducir una biblioteca de consultas ni extraer el modelo web a un paquete compartido.

## Definir los datos antes del loader

- [ ] Definir `PlayerHomeSource<T>` como una unión de éxito con DTO y fallo con error.
- [ ] Definir `PlayerHomeSnapshot` con contexto de club y seis fuentes identificadas.
- [ ] Conservar `needs_club`, `needs_game_account` y `ready` de las respuestas del proveedor.
- [ ] Distinguir una respuesta vacía válida de un error de HTTP, red o contrato.
- [ ] Recibir `externalClubId` y `AbortSignal` como entradas del consumidor.
- [ ] Permitir inyectar un `FutrobClient` para verificar el loader con el SDK real y un transporte de prueba.

Model the Domain determina la unión por fuente.
El snapshot no contiene flags redundantes de éxito y error ni referencias a una organización inventada.
Los IDs del club proceden del consumidor y del servidor.

## Consultar las seis fuentes

- [ ] Ejecutar las seis lecturas en paralelo.
- [ ] Usar `client.players.getProfile(options)` para el perfil, las cuentas y los clubes.
- [ ] Usar `client.statistics.getMyRecentMatches(query, options)` para los partidos del proveedor.
- [ ] Usar `client.statistics.getMyGameProfile(query, options)` para el perfil de rendimiento.
- [ ] Usar `client.competitions.listMine(options)` para las competiciones accesibles.
- [ ] Usar `client.players.getNextEncounter(options)` para el próximo enfrentamiento.
- [ ] Usar `client.teams.rosterInvitations.listMine(options)` para las invitaciones de plantilla.
- [ ] Pasar el mismo `externalClubId` a recientes y game profile cuando exista.
- [ ] Pasar la señal a todas las operaciones y conservar los reintentos actuales del SDK.
- [ ] Devolver los éxitos aunque otra fuente falle con un error recuperable.
- [ ] Propagar un 401 como fallo global y no entregar un snapshot con datos protegidos.
- [ ] Reutilizar la limpieza de sesión de `futrob-client.ts` ante 401.
- [ ] Propagar la cancelación. No convertirla en un home vacío ni en un fallo recuperable ordinario.

Sin `externalClubId`, pasar `{}` a las dos consultas del proveedor.
La API consulta todos los clubes asociados cuando se omite el ID.
El loader no presupone que esas respuestas pertenecen al primer club del perfil.
Sin clubes o sin cuenta, los casos de uso del servidor devuelven sus estados antes de llamar a EA.

## Resolver un modelo puro para el consumidor móvil

- [ ] Adaptar las respuestas al modelo móvil sin importar módulos de `apps/web`.
- [ ] Usar el modelo y los tests web como referencia de precedencia.
- [ ] Resolver `onboarding` cuando no hay club seleccionado ni cuenta de juego.
- [ ] Resolver `select-club` cuando existe cuenta y falta el club seleccionado.
- [ ] Resolver `dashboard` cuando existe club seleccionado y asociado.
- [ ] En dashboard, resolver `no-competitions` antes de evaluar el próximo enfrentamiento, como hace web.
- [ ] Con competiciones y próximo enfrentamiento, conservar equipos, fecha y zona horaria en `next-encounter`.
- [ ] Con competiciones y sin próximo enfrentamiento, resolver `no-upcoming`.
- [ ] Contar únicamente invitaciones con estado `pending`.
- [ ] Conservar `played` y `not_played` de cada partido. No inventar una aparición.
- [ ] Conservar el orden del servidor para el último partido. No ordenar ni recalcular estadísticas en móvil.
- [ ] Mantener el error de una fuente en los apartados que dependen de ella.
- [ ] Impedir que un perfil fallido se interprete como jugador sin cuenta ni club.
- [ ] Impedir que competiciones fallidas se interpreten como `no-competitions`.
- [ ] Impedir que recientes fallidos se interpreten como ausencia de actividad.
- [ ] Sin club seleccionado, conservar las respuestas generales sin presentarlas como datos de un club elegido.
- [ ] Ante un ID que no pertenece al perfil, conservar el error o el estado de contexto inválido. No elegir otro club silenciosamente.

La selección por defecto y su persistencia pertenecen al consumidor del loader.
Esta entrega no incorpora un selector de clubes ni cambia el switcher.
El modelo ofrece datos y estados. La futura UI decide cómo renderizarlos y cuándo cargar o reintentar.

## Probar el comportamiento observable

Usar `createFutrobClient` de `@futrob/sdk` y `mockFetch` de `@futrob/sdk/testing` en los tests del loader.
Las pruebas deben ejecutar el consumidor real del SDK y comparar su salida con valores concretos.
Las inspecciones de peticiones complementan esas aserciones. No son la única prueba.

- [ ] Con seis respuestas exitosas, comprobar el snapshot con perfil, último partido, rendimiento, competición, enfrentamiento e invitaciones concretos.
- [ ] Resolver next encounter e invitaciones en órdenes distintos y comprobar el mismo resultado.
- [ ] Mantener una respuesta pendiente y comprobar que las otras fuentes pueden avanzar sin esperar su resolución.
- [ ] Con dos clubes asociados y uno seleccionado, comprobar que recientes y rendimiento corresponden al seleccionado.
- [ ] Sin ID seleccionado, comprobar el contexto sin selección y conservar la respuesta general de la API.
- [ ] Con `needs_club`, comprobar el estado que pide seleccionar o asociar club.
- [ ] Con `needs_game_account`, comprobar el estado de cuenta pendiente sin confundirlo con una lista vacía.
- [ ] Con una competición y un enfrentamiento entre Cuervos y Maderas, comprobar el modelo `next-encounter` y sus equipos.
- [ ] Con una competición sin enfrentamiento, comprobar `no-upcoming`.
- [ ] Sin competiciones, comprobar `no-competitions`.
- [ ] Con invitaciones pendientes y aceptadas, comprobar el recuento exacto de pendientes.
- [ ] Con un partido `not_played`, comprobar que el modelo no crea estadísticas ni una aparición personal.
- [ ] Con un 503 de recientes y un enfrentamiento válido, comprobar que el enfrentamiento se conserva y recientes permanece en error.
- [ ] Con un 403 de competiciones, comprobar que el modelo no declara ausencia de competiciones.
- [ ] Con un 429 y `retryAfterSeconds` igual a 30, comprobar que la fuente conserva ambos valores y las demás fuentes conservan sus datos.
- [ ] Con un timeout o un fallo de red, comprobar su clasificación sin convertirlo en un error de negocio ni en ausencia de datos.
- [ ] Con una respuesta incompatible con el schema, comprobar un error de contrato en esa fuente.
- [ ] Con un 401 en cualquiera de las seis fuentes, comprobar que el loader falla globalmente y la fábrica móvil limpia la sesión.
- [ ] Con una señal abortada, comprobar la cancelación observable y la ausencia de un snapshot exitoso.
- [ ] Cargar club A y club B con clientes o entradas independientes. Comprobar que cada resultado conserva su propio contexto.

Test Behavior, Not Implementation cambia las pruebas propuestas en Notion.
Comprobar las seis lecturas una vez puede ser una aserción auxiliar.
La prueba principal debe fallar si el loader devuelve `undefined`, omite una fuente o mezcla los clubes.
No exigir un orden entre `getNextEncounter` y `listMine`.

## Ejecutar los checks durante la implementación

- [ ] Ejecutar `npm run test -- --run --project mobile`.
- [ ] Ejecutar `npm run typecheck -w @futrob/mobile`.
- [ ] Ejecutar `npm run check`.
- [ ] Ejecutar `npm run test -- --run` para el cierre de la entrega.
- [ ] Si falla un check por configuración o entorno, registrar el comando y el fallo concreto.
- [ ] Distinguir las pruebas con transporte simulado de una integración real con auth, BFF, API y EA.

El proyecto de tests `mobile` ya está incluido en `vite.config.ts`.
El plan no añade otra configuración de tests.
Estos checks están pendientes de implementación.

## Organizar una sola entrega verificable

- [ ] Confirmar contratos y ejemplos válidos antes de escribir lógica.
- [ ] Implementar el modelo con sus pruebas de estados.
- [ ] Implementar el loader con sus pruebas de SDK y recuperación.
- [ ] Ejecutar los checks y revisar que no se modificaron pantallas.
- [ ] Entregar las firmas públicas, los casos cubiertos y los límites de integración.

El checkpoint de implementación contiene estas decisiones.

- Los contratos existentes son el primer paso bloqueante.
- El modelo y el loader pertenecen a una sola entrega. Sus pruebas necesitan las mismas formas de datos.
- Las consultas son independientes y no escriben estado global, caché ni selección persistida.
- Un implementador puede mantener los dos módulos coherentes. La revisión de contratos y comportamiento se hace de forma independiente.

## Aceptar la entrega de lógica

- [ ] El consumidor puede obtener y adaptar las seis fuentes mediante el SDK.
- [ ] El modelo distingue datos, ausencia válida, configuración pendiente y fallos.
- [ ] Un 401 y una cancelación impiden devolver un resultado exitoso.
- [ ] El club seleccionado es explícito y no se mezcla con datos de otro contexto.
- [ ] Las pruebas comprueban resultados concretos y están incluidas en la suite móvil.
- [ ] Las pantallas y el shell actuales no cambian.
- [ ] La evidencia distingue esta entrega de un smoke nativo o de una integración EA real.

## Referencias y hallazgos de la investigación

La investigación revisa el checkout `2efe2738e8475cf4268c6c4967507d7a16fc47de`.

- `apps/mobile/src/modules/api/futrob-client.ts` centraliza Bearer y limpieza local ante 401.
- `apps/mobile/src/modules/authorization/native-destination.tsx` carga perfil, membresías y competiciones. No carga el home de seis fuentes.
- `apps/web/src/modules/player-home/presentation/use-player-home.ts` compone las seis fuentes y sus estados.
- `apps/web/src/modules/player-home/presentation/player-home-model.ts` define la precedencia de los estados del home.
- `apps/web/src/modules/player-home/presentation/player-home-model.test.ts` contiene la matriz web.
- `packages/sdk/src/resources/players.ts`, `statistics.ts`, `competitions.ts` y `roster-invitations.ts` contienen los métodos actuales.
- `apps/api/src/http/routes/players.ts` conserva todos los clubes al omitir el filtro.
- Las rutas BFF de recientes y game profile comparten la política `eaClubSearch`. Sus fallos de rate limit permanecen visibles por fuente.
- `apps/mobile/vite.config.ts` define el proyecto `mobile` en Node.
- `.agents/skills/futrob-sdk/SKILL.md` y sus referencias de consumo y transporte gobiernan el cliente móvil.
- La elaboración del plan aplica `poteto-mode` y `principle-test-behavior-not-implementation`.

No hay una decisión de producto pendiente para escribir este loader.
La selección inicial de club y el momento de refresco quedan en el futuro consumidor UI.
No se midió integración nativa, latencia real ni disponibilidad de EA.
