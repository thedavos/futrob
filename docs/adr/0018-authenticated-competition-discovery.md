# ADR-0018: Descubrimiento autenticado de competiciones publicadas

- Estado: Aceptada
- Fecha: 2026-09-27
- Actualizada: 2026-09-28
- Relacionado: [ADR-0002](/docs/adr/0002-hexagonal-feature-modules.md) · [ADR-0005](/docs/adr/0005-typed-private-api.md) · [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Explorar competiciones necesita una lectura entre organizaciones. Las lecturas
existentes no sirven: `GET /organizations/:orgId/competitions` exige
`competitions.read` sobre el tenant, y `GET /competitions/mine` solo devuelve
competiciones donde el actor es miembro o forma parte de una plantilla
aprobada. El glosario reserva el portal público para la superficie anónima de
una Competition publicada; esa BC sigue vacía y no es este flujo.

## Decisión

Cualquier actor autenticado puede descubrir competiciones en
`published`, `paused` o `finished`. `draft` permanece trabajo privado del
organizador. `archived` queda fuera del catálogo.

La política vive una sola vez en `@futrob/competitions` como
`DISCOVERABLE_COMPETITION_STATUSES`. El port `CompetitionDiscoveryReader` es
una lectura aparte de `CompetitionRepository` para no mezclar el agregado de
escritura con el catálogo de descubrimiento. Los use cases
`ListDiscoverableCompetitionsUseCase` y `GetDiscoverableCompetitionUseCase`
aplican esa política; un id inexistente o no descubrible responde
`competitions.not_discoverable`.

La API expone `GET /competitions/explore` y
`GET /competitions/explore/:competitionId` con service auth. El nombre de la
organización se resuelve en `apps/api` con `OrganizationRepository.getByIds`,
por lote de ids únicos de la página, sin abrir `public-portal` ni leer tablas
ajenas desde el adapter de competiciones. Esta ampliación sustituye la lectura
individual inicial para evitar N+1 consultas.

La UI deriva `ExploreViewerRelation` (`manager` | `participant` | `visitor`)
solo para acciones de presentación. El destino `/player/competitions/:id` y
las rutas de gestión vuelven a autorizar.

## Consecuencias

- Un visitante autenticado ve metadatos sanitizados (sin `createdByActorId` ni
  `creationKey`) y el recuento de equipos aprobados.
- El portal público anónimo no queda habilitado por esta decisión.
- La inscripción por cuenta propia sigue fuera de alcance: hoy solo el staff
  inscribe equipos, y solo en `draft`. Reemplazado por
  [ADR-0019](/docs/adr/0019-competition-registration-and-applications.md):
  `registration` es descubrible y admite postulaciones.

## Alternativas consideradas

- **Solo frontend sobre `mine` o la lista de organización.** No cubre
  competiciones ajenas.
- **Abrir `public-portal` ahora.** Mezclaría lectura anónima con un flujo
  autenticado y adelantaría una BC vacía.
- **Reutilizar `CompetitionRepository.findById` sin filtro de estado.**
  Expondría borradores si un cliente adivinara el id.

## Estado de implementación y evidencia

- Política, port y use cases en `@futrob/competitions`.
- Contratos `explore*` en `@futrob/api-contracts` y métodos SDK
  `competitions.explore` / `getExplore`.
- Adapters Postgres/in-memory y query de composición en `apps/api`. La migración
  `0042` agrega índices parciales para ambos órdenes del catálogo y conteos por
  organización/competición. Postgres pagina antes de contar inscripciones y
  mantiene el total filtrado independiente del cursor, incluso con página vacía.
  Los cursores conservan los microsegundos de Postgres.
- `discovery.integration.test.ts` verifica paginación, filtros, aislamiento,
  lectura por lotes e instalación/actualización de índices en Postgres 16 local.
- Superficie web autenticada en `/player/competitions/explore` y
  `/player/competitions/$competitionId`.
