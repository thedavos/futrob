# ADR-0035: Competiciones de fútbol con fuentes de resultados más allá de EA

- Estado: Aceptada
- Fecha: 2026-11-24
- Relacionado: [ADR-0006](/docs/adr/0006-game-data-provider-port.md) ·
  [ADR-0007](/docs/adr/0007-immutable-provider-observations.md) ·
  [ADR-0013](/docs/adr/0013-ea-egress-api-only.md) ·
  [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

El [PRD](/product/prd.md) definía Futrob como una plataforma especializada en EA SPORTS FC.
La visión de producto se amplía: Futrob sirve para crear, operar y seguir ligas, copas y
torneos de fútbol, ya sea en la vida real o en videojuegos de fútbol.

El MVP no cambia. Sigue validando la visión con EA SPORTS FC / FC Clubs, donde la API de EA
permite automatizar candidatos, resultados y estadísticas. La siguiente etapa abrirá la
creación de competiciones al público con resultados cargados manualmente o desde otras
fuentes que dispongan de API.

[ADR-0006](/docs/adr/0006-game-data-provider-port.md) ya dejó el contexto `game-data` neutral
(`ProviderMatch`, `ExternalClub`, `GameDataProviderPort`, registro por `provider_key`) con el
objetivo explícito de añadir fuentes manuales u otros proveedores sin reescribir `results`,
`statistics` ni `scheduling`. Sin embargo, el producto, la edición y modalidad de la competición
([PRD §4](/product/prd.md#4-edición-y-modalidad)) y el flujo de selección oficial asumen hoy
que todo resultado nace de un partido de EA.

## Decisión

Decisión aceptada por instrucción explícita del usuario el 2026-11-24.

1. **Visión:** Futrob es una plataforma de competiciones de fútbol, en la cancha o en
   videojuegos. EA SPORTS FC es la primera fuente, no el límite del producto.
2. **Alcance del MVP intacto:** competiciones FC Clubs con datos de EA y selección y
   confirmación humana ([DEC-001](/product/open-decisions.md)). Nada de esta decisión se
   implementa dentro del MVP ni bloquea sus criterios de aceptación.
3. **Post-MVP:** cada competición declara su **fuente de resultados**. Las fuentes previstas son:
   - **Proveedor con API** (EA hoy; otros después): sigue el camino de ADR-0006. Cada proveedor
     es un adapter registrado en la API de producto, con su propio egress concentrado en
     `apps/api`, igual que [ADR-0013](/docs/adr/0013-ea-egress-api-only.md) hace para EA.
   - **Manual:** las partes cargan el marcador (y, si la competición lo pide, goles, asistencias
     y tarjetas) sin proveedor externo. Es la fuente de las competiciones de fútbol real y el
     respaldo de las de videojuegos cuando no hay API.
4. **Invariante conservada:** ninguna fuente altera por sí sola tabla, bracket, estadísticas,
   rankings ni portal. Un dato cargado o sincronizado es candidato hasta que `results` lo
   oficializa. Las proyecciones solo cambian con las transiciones de `results` que ya las
   actualizan en la misma transacción, la aprobación y la anulación
   ([ADR-0016](/docs/adr/0016-official-results-transactional-projection.md)), cualquiera que
   sea el origen del dato.
5. **Ownership:** la fuente y sus datos crudos pertenecen a `game-data`; la confirmación y la
   oficialización, a `results`. `scheduling ≠ game-data ≠ results ≠ statistics ≠ analytics` se
   mantiene.

## Consecuencias

- PRD y README describen la visión amplia y presentan EA como el foco del MVP. El copy de la
  landing, SEO, precios y términos sigue hablando de EA SPORTS FC Clubs porque describe lo que
  el producto ofrece hoy; se actualiza cuando exista una fuente distinta de EA.
- Mientras dure el MVP no hay cambios de contrato `/api/v1`, esquema ni UI.
- Las competiciones manuales tendrán estadísticas más pobres que las de EA. Las analíticas
  premium deben declarar qué fuentes alimentan cada métrica en lugar de suponer datos de EA.
- Abrir la creación al público cambia supuestos de acceso y abuso: hoy se crean competiciones
  dentro de organizaciones con planes de [ADR-0025](/docs/adr/0025-billing-plans-and-entitlements.md).
- El modelo de edición y modalidad deberá generalizarse (por ejemplo, fútbol 5, 7 u 11) y el
  `ExternalClub` dejará de ser requisito para que un equipo compita.

## Alternativas consideradas

- **Cambiar el alcance del MVP ahora.** Rechazada: retrasa el MVP y diluye su diferenciador
  (automatización con datos de EA) antes de validarlo.
- **Mantener Futrob solo para EA SPORTS FC.** Rechazada por producto: limita el mercado y
  desaprovecha la neutralidad que ADR-0006 ya pagó.
- **Un bounded context nuevo para resultados manuales.** No elegida: duplicaría el ciclo
  candidato → selección → confirmación. La fuente manual se modela como un proveedor más de
  `game-data`, salvo que el diseño detallado demuestre lo contrario.

## Cuestiones pendientes

- Flujo de la fuente manual: quién carga el marcador (capitanes, árbitro u organizador), cómo
  se confirma entre las partes y qué evidencia se puede adjuntar. OCR sigue fuera como camino
  feliz ([open-decisions §8](/product/open-decisions.md)).
- Si la fuente es fija por competición o puede combinarse (EA con respaldo manual) y cómo se
  reconcilian dos fuentes para el mismo partido.
- Generalización de edición y modalidad, y reglas propias del fútbol real (sedes, árbitros,
  suspensiones por acumulación de tarjetas, prórroga y penales).
- Si `game-data` conserva su nombre cuando incluya partidos de fútbol real.
- Modelo de acceso y planes para la creación pública de competiciones.
- Qué otros proveedores con API se priorizan.

## Estado de implementación y evidencia

Esta decisión solo cambió documentación: la visión en el [PRD](/product/prd.md), el
[README](/README.md), el [roadmap](/product/mvp-requirements.md) y
[DEC-001](/product/open-decisions.md). No hay código ni contratos nuevos.

- El port neutral de ADR-0006 existe y la composición de la API ya registra
  `ManualGameDataAdapter` con la clave `manual` (`apps/api/src/di/create-modules.ts`). Su
  lectura de partidos devuelve `game_data.provider_not_implemented`; la captura, la ingesta y
  la confirmación de resultados manuales siguen pendientes. La prueba
  `apps/api/src/di/game-data-providers.composition.test.ts` cubre ese registro y el error
  actual; no se ejecutó en esta revisión documental.
- No hay adapters de otros proveedores con API.
- Al implementar la fuente manual hay que comprobar que una carga pendiente no proyecta, que
  la aprobación aporta una sola vez y que la anulación retira la contribución y revierte el
  avance del cuadro.
