# ADR-0024: Lecturas públicas anónimas del portal

- Estado: Aceptada
- Fecha: 2026-10-29
- Relacionado: [ADR-0004](/docs/adr/0004-multi-tenant-d1-scoping.md) · [ADR-0005](/docs/adr/0005-typed-private-api.md) · [ADR-0018](/docs/adr/0018-authenticated-competition-discovery.md) · [ADR-0022](/docs/adr/0022-organization-profile-and-logo.md)
- Extiende: ADR-0005 (un grupo de rutas anónimo de primera parte, junto al contrato privado) y ADR-0018 (la lectura anónima que aquel dejó fuera)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

FR-16 pide un portal para espectadores con portada, calendario, resultados, tabla,
bracket, equipos y jugadores, y FTR-PUB-001 prohíbe que lleguen datos privados, tokens,
identificadores internos de plataforma o payloads crudos de EA. Hoy `@futrob/public-portal`
está vacío. Las lecturas de tabla y rankings existen, pero exigen `STATISTICS_PERMISSION.read`
(organizador y staff) y devuelven `organizationId` y `playerProfileId`; no sirven como contrato
público. ADR-0005 limita el contrato `/api/v1` a clientes propios con autenticación de
servicio, y ADR-0018 dejó explícitamente fuera el portal anónimo.

## Decisión

**Un grupo de rutas anónimo de primera parte.** `GET /api/v1/public/competitions/{publicKey}`,
`.../standings` y `.../calendar` no usan `createServiceAuthMiddleware`: no leen sesión ni
secreto de servicio. Es un contrato para nuestras propias superficies (web, SSR, móvil), no
una API de terceros: ADR-0005 sigue vigente para todo lo demás y las rutas privadas no cambian.
No se añade `?public=true` a rutas con `organizationId`; el grupo público es otro árbol.

**La lógica vive en `@futrob/public-portal`**, no en la ruta ni en `statistics`.
Los casos de uso (`GetPublicCompetitionUseCase`, `GetPublicStandingsUseCase`,
`GetPublicCalendarUseCase`) reciben una `PublicCompetitionKey` y ningún `ActorId`. Dependen de
cuatro puertos de lectura propios (`PublishedCompetitionReaderPort`, `PublicStandingsReaderPort`,
`PublicCalendarReaderPort`, `PublicTeamDirectoryPort`); los adapters están en
`apps/api/src/adapters/public-portal/` y se componen en `apps/api/src/di/public-portal.module.ts`.

**Publicación como única puerta.** `resolvePublishedCompetition` es el único punto que decide
si un espectador ve algo. Son visibles `published`, `paused` y `finished`. `draft`, `archived` y
`registration` responden igual que una clave inexistente: `404 public_portal.competition_not_found`,
sin pistas del motivo. `registration` es descubrible por actores autenticados (ADR-0018) pero aún
no tiene fixture, tabla ni resultados, así que el portal anónimo no existe para esa fase. Si ya
no hay publicación, ningún otro lector (estadísticas, calendario, equipos) se invoca.

**Proyección por allowlist, no por borrado.** Cada respuesta se construye campo a campo desde un
tipo de salida propio; no se hace spread ni se elimina de un DTO privado. Los schemas de
`@futrob/api-contracts` son `z.strictObject`: una clave inesperada hace fallar el parseo de la
respuesta en la API (500, no fuga) y en el SDK. Quedan fuera por construcción: `organizationId`,
`competitionId`, `teamId`, `playerProfileId`, `createdByActorId`, `creationKey`, el nombre de
la organización, la clave de portada subida (incluye el `organizationId` en la ruta de R2),
`formulaVersion`, `sourceRevisionMax`, candidatos, `fixturePlanId`, y todo `OfficialResult`
(`slots`, `providerMatchRef`, ids de club EA, estadísticas por jugador, `approvedBy`). Una fila de
tabla o de calendario cuyo equipo no tenga nombre público se omite en lugar de mostrar un id.

**La clave pública es opaca y está pendiente de decisión de producto.** `PublicCompetitionKey`
no es un `CompetitionId`. El único lugar que sabe cómo se relaciona con el id interno es
`DiscoveryPublishedCompetitionReader`; hoy la clave se interpreta como `competitionId`. Los tests
de `public-portal` usan una clave distinta del id para que ningún caso de uso pueda asumir
igualdad. Cambiar a un slug o código corto toca un adapter, el contrato de la ruta no cambia.
El slug de organización (ADR-0022) no basta: no identifica una competición.

**Caché explícita para la futura capa pública.** Las respuestas 200 envían
`Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=60`
(`PUBLIC_READ_CACHE_CONTROL`). El navegador siempre revalida; una caché compartida puede servir
30 s y una copia vieja otros 60 s mientras refresca. Las proyecciones oficiales se ejecutan en
proceso al confirmar un resultado, así que esa ventana es lo máximo que un espectador ve la tabla
anterior. Los errores siguen `no-store`: su cuerpo lleva el `requestId` de la petición. No hay
`Set-Cookie`, no se lee `Authorization` y la respuesta no varía por credenciales. Pendiente para la
tarea de caché pública: quitar `X-Request-ID` de las copias almacenadas, decidir invalidación con
`statistics.rankings-updated`, `ETag` y rate limiting en el borde. Esas cifras son un punto de
partida; cambiarlas es editar una constante.

## Consecuencias

- Hay un primer endpoint sin autenticación en el producto además de `meta`. Su seguridad depende de
  la puerta de publicación, de las proyecciones por allowlist y de los schemas estrictos, no del
  cliente. Los tests comprueban el JSON literal, la ausencia de ids internos y de payloads EA,
  el 404 sin fuga y que las rutas privadas sigan respondiendo 401/403.
- Un ID público igual al interno significa que conocer un `competitionId` publicado basta para
  leerlo. Es información ya visible en la URL; los permisos privados siguen exigiendo ownership
  (ADR-0004).
- La tabla pública de una competición sin proyección es una tabla vacía (200), no un error.
- Resultados, bracket, equipos, jugadores y rankings no existen todavía como lecturas públicas.

## Alternativas descartadas

- **Abrir `GetCompetitionStandingsUseCase`/`GetCompetitionRankingsUseCase` a anónimos.** Mezcla
  autorización de staff con lectura pública y devuelve `organizationId` y `playerProfileId`.
- **Reutilizar los DTO privados quitando campos.** Un campo nuevo se publicaría por omisión.
- **Pasar por el BFF con `INTERNAL_JOB_SECRET`.** Haría que el secreto de servicio viaje por una
  ruta cacheable y que la caché pública dependa de credenciales.
- **Fijar ya un slug por competición.** Es una decisión de producto con migración y colisiones;
  no bloquea el contrato.

## Estado de implementación y evidencia

Decisión aceptada; composición in-memory y Postgres de lectura conectada; **no se ejecutó una
prueba contra Postgres real ni contra Cloudflare en esta revisión**.

- [Casos de uso y puertos](/packages/public-portal/src/index.ts) con pruebas de proyección, 404 y
  ausencia de lecturas posteriores sin publicación.
- [Schemas estrictos](/packages/api-contracts/src/v1/public-portal/schemas.ts).
- [Rutas y caché](/apps/api/src/http/routes/public-portal.ts) y
  [prueba HTTP anónima](/apps/api/src/http/routes/public-portal.test.ts).
- [Adapters](/apps/api/src/adapters/public-portal/readers.ts) y
  [composición](/apps/api/src/di/public-portal.module.ts).
- SDK: `client.publicPortal.{getCompetition,getStandings,getCalendar}`.

Pendiente: resultados sanitizados (puntajes por partido sin `slots`), bracket (404 en formato
liga), equipos, jugadores (requiere nombre público y un listado por competición que
`PlayerCompetitionStatsRepository` no ofrece), rankings y premios, portada subida (ruta pública de
media), nombre público de la organización, referencia pública de equipo y de encuentro, y la
elección de la clave pública.
