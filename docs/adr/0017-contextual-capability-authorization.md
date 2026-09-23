# ADR-0017: Autorización contextual por capacidades

- Estado: Aceptada
- Fecha: 2026-09-22
- Relacionado: [ADR-0004](/docs/adr/0004-multi-tenant-d1-scoping.md) · [ADR-0015](/docs/adr/0015-auth-extraction.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Un actor puede operar con permisos distintos en organizaciones, competiciones y
plantillas. Ser miembro de una competición no equivale a estar inscrito como equipo
ni a ser capitán de una plantilla. Roles globales o comparaciones de strings en UI
no representan ese modelo. Este ADR formaliza el resolver existente.

## Decisión

Los casos de uso protegidos consultan `AuthorizationPort` con actor de confianza,
capacidad y scope. Cada BC publica sus permisos/bundles; la API compone las lecturas
de organizaciones, competiciones, equipos, rosters, grants y roles de plataforma.

El resolver valida existencia y pertenencia de los recursos. Una competición exige
organización; un Encounter exige organización y competición; un equipo y un Encounter
combinados deben corresponder a uno de sus participantes. Una relación inválida deniega
el acceso, aunque el actor tenga permisos en otro recurso.

### Precedencia

Las capas aplicables se recorren de general a específica:
`platform → organization → competition → team → encounter`.
No todos los requests necesitan todas las capas.

Para cada capacidad:

1. Se parte de denegado, sin asignación.
2. En una misma capa, un grant `deny` prevalece sobre grants `allow` y el bundle del rol.
3. Sin deny, un grant allow permite; sin grants decisivos, un permiso del bundle permite.
4. Una decisión en una capa posterior prevalece sobre la heredada, incluso si es un
   permiso de su bundle. Una capa sin decisión conserva el resultado anterior.

Por tanto, `deny` no es una prohibición global absoluta: un allow más específico puede
superarlo. Esta semántica debe conservarse en UI, auditoría y cambios del resolver.

| Caso                                             | Resultado                         |
| ------------------------------------------------ | --------------------------------- |
| Allow y deny en la misma capa                    | Denegado                          |
| Deny de organización y allow aplicable de equipo | Permitido en ese equipo           |
| Allow de organización y deny de competición      | Denegado en esa competición       |
| Scope inexistente o inconsistente                | Denegado antes de resolver grants |

Las capacidades de capitán/subcapitán/jugador se derivan del roster contextual, con
las comprobaciones de participación que exige la operación. No se elevan a rol de
organización. El acceso personal a estadísticas propias tiene semántica de actor,
no requiere inventar una organización ni autoriza leer el perfil de otro actor.

### Presentación

El servidor devuelve `EffectiveAccess`. Web usa `can`, `useCan` y `useCapabilities` con
las constantes del BC; Expo usa sus helpers nativos. La UI se mantiene cerrada durante
carga/error y evita controles no autorizados. El backend vuelve a autorizar la operación;
el payload de UI o la caché no son credenciales.

## Consecuencias

- El cambio de un bundle o de la precedencia afecta varios flujos y requiere pruebas de matriz.
- Organización, CompetitionEntry, membresía de competición y roster conservan significados distintos.
- Los grants deben auditarse y quedar ligados a actor/scope; no son roles autodeclarados.
- La autenticación de ADR-0015 y el aislamiento de ADR-0004 siguen siendo necesarios.

## Alternativas descartadas

Roles de organización usados para toda operación; roles embebidos en claims cliente
como autoridad; autorización solo visual; deny absoluto global que contradiga la
semántica contextual elegida.

## Estado de implementación y evidencia

El resolver y sus pruebas existen. La cobertura de cada caso de uso se comprueba por
flujo; este ADR no afirma que todo endpoint haya sido auditado.

- [AuthorizationPort](/packages/shared-kernel/src/authorization.port.ts).
- [Resolver y relaciones de scope](/apps/api/src/adapters/authorization/contextual-authorization.adapter.ts).
- [Precedencia](/apps/api/src/adapters/authorization/contextual-resolution.ts).
- [Pruebas de resolución](/apps/api/src/adapters/authorization/contextual-authorization.adapter.test.ts)
  y [matriz](/apps/api/src/adapters/authorization/rbac-matrix.test.ts).
- [Helpers web](/apps/web/src/shared/presentation/permissions/index.ts)
  y [helpers nativos](/apps/mobile/src/modules/authorization/permissions.ts).
