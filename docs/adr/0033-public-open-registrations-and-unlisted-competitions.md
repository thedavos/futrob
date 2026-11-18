# ADR-0033: Inscripciones abiertas en la landing y competiciones no listadas

- Estado: Aceptada
- Fecha: 2026-11-18
- Relacionado: [ADR-0019](/docs/adr/0019-competition-registration-and-applications.md) · [ADR-0024](/docs/adr/0024-anonymous-public-portal-reads.md)
- Reemplaza en parte: la consecuencia de [ADR-0018](/docs/adr/0018-authenticated-competition-discovery.md) de que Explorar solo es visible con sesión
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Un visitante sin sesión que busca su club en la landing no tiene a qué unirse: Explorar exige
sesión. A la vez, un organizador no tiene forma de sacar de Explorar una competición que solo
quiere compartir por enlace.

## Decisión

**Lista pública de inscripciones abiertas.** La landing muestra hasta 6 competiciones en
`registration`. `apps/api` expone `GET /internal/competitions/explore/open` con el secreto
interno y sin actor, como la búsqueda de clubes sin sesión. El servidor fija el estado
`registration` y el orden por actualización; el cliente solo elige plataforma y un límite de 1 a 6. La web lo sirve en `GET /api/v1/public/competitions/explore`, limitado por IP con la política
`public-competition-explore` (30 por minuto). No abre el portal público: la lectura reutiliza el
catálogo de Explorar (`CompetitionDiscoveryReader`) y su DTO.

**Competiciones no listadas.** `Competition.exploreListing` es `listed` o `unlisted`
(`competitions.explore_listing`, migración `0070`, `listed` por defecto). Una competición
`unlisted` sale de toda lista de Explorar, con o sin sesión, pero su detalle sigue accesible por
id: participantes y postulantes llegan por `/player/competitions/$competitionId`, que lee ese
detalle. La visibilidad del portal público no cambia; sigue dependiendo del estado (ADR-0024).
`UpdateCompetitionExploreListingUseCase` exige `competitions.update`, es idempotente y deja
de solo lectura las competiciones archivadas. No se audita, como la portada.

## Consecuencias

- Un visitante anónimo ve nombre, organización, formato, plataforma, cupo y fechas de las
  competiciones abiertas y listadas. «Unirme» lo lleva a registro y a la revisión del
  onboarding de jugador con el handoff `competition`, y termina en el detalle con la
  postulación lista.
- «No listada» no es privada: quien tenga el enlace con sesión ve el detalle y puede postular.
- El listado de una organización y el portal ignoran `exploreListing`.

## Alternativas consideradas

- **Abrir `/competitions/explore` sin sesión.** Expondría filtros, cursor y estados que la
  landing no necesita y ampliaría la superficie anónima.
- **Ocultar también el detalle.** Cortaría el acceso de participantes y postulantes que llegan
  por enlace.
- **Un booleano `hidden`.** Un estado con nombre se lee mejor en contrato, SQL y UI.

## Estado de implementación y evidencia

- Dominio, use case y puerto en `@futrob/competitions`; adapters Postgres e in-memory en
  `apps/api/src/adapters/competitions/`.
- Contratos `openCompetitions*` y `updateCompetitionExploreListing*` en
  `@futrob/api-contracts`; SDK `competitions.listOpenAnonymously` y
  `competitions.updateExploreListing`.
- Pruebas: `competitions.test.ts` (403 sin permiso, 401 sin secreto, estado fijo, no listadas
  excluidas) y `discovery.integration.test.ts` en Postgres 17 local.
- Web: interruptor «Mostrar en Explorar» en el resumen de la competición y panel «Inscripciones
  abiertas» en `#demo` de la landing. Móvil no tiene ajustes de competición del organizador.
