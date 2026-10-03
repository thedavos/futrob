# Ranking de rendimiento de equipos — verificación

Fecha: 2026-10-02. Rama: `feat/team-performance-ranking`, worktree
`../futrob-team-performance-ranking`, actualizada contra `main` en `03a9dc3`
(incluye #99). No se desplegó ni se aplicaron migraciones al schema de producto.

Referencias de alcance:
[ranking de rendimiento](https://app.notion.com/p/3a07b204009a8155aa9ec6fe35a9caf1) y
[lectura API](https://app.notion.com/p/3dc7b204009a8142a751f21cb9af867c).
Las reglas, denominadores, ejemplos y distinción entre decisiones existentes y
normalizaciones propuestas están en [el contrato de producto](/product/team-performance-v1.md).

## Fronteras implementadas

- Statistics posee política, snapshot, componentes/cobertura, repository, rebuild y
  consulta autorizada. Usa `scoreTeamPerformance`; la fórmula y los pesos originales
  permanecen intactos. No añade un ranking kind de jugador ni cambia standings.
- La fuente usa los readers públicos de Results/Competitions y el repository propio
  de contribuciones. Obtiene `occurredAt` del slot oficial; no cambia el schema de
  contribuciones ni consulta EA. Los readers existentes admiten organization scope
  opcional, compatible con sus consumidores anteriores.
- API persiste con migración `0047_team_performance_rankings.sql` y adapters
  memory/Postgres. Composición de aprobación/anulación y reconstrucción adquieren exclusión por competición antes
  de leer fuentes, usan el executor transaccional y rechazan reemplazos CAS stale.
- Endpoint privado: `GET /organizations/{organizationId}/competitions/{competitionId}/team-performance-ranking`.
  SDK: `statistics.getTeamPerformanceRanking`. BFF expone la misma lectura con actor
  de sesión y schema compartido. Zod/OpenAPI explican versiones, estado, missing
  keys, numeradores/denominadores y procedencia; no transportan payloads raw.
- No se abren UI, analytics, superficies públicas/premium, pagos o pesos editables.

## Evidencia ejecutada

| Comprobación                                                         | Resultado                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp install`                                                         | Dependencias instaladas; lockfile sin cambios.                                                                                               |
| `npm run generate:routes`                                            | BFF incluido en el árbol generado.                                                                                                           |
| `npm run generate:openapi`                                           | JSON/YAML regenerados desde los contratos.                                                                                                   |
| Pruebas focalizadas de API, Results, Statistics, API contracts y SDK | 1.589 pruebas pasan en 112 archivos; 70 omitidas sin Postgres.                                                                               |
| Suite general `npm run test:coverage`                                | 3.327 pruebas pasan en 413 archivos; 79 omitidas sin `TEST_DATABASE_URL`. Incluye historias en navegador y supera los umbrales de cobertura. |
| `npm run check -- --fix` y `npm run typecheck`                       | Formatter/lint/type-aware sin errores; typechecks de los 24 workspaces pasan.                                                                |
| `npm run build` y `npm run bundle:budget`                            | Web/Worker compila; entry 71,58/250 KiB y mayor chunk lazy 112,45/120 KiB.                                                                   |
| Integración Postgres                                                 | 16 casos pasan en 4 archivos: 7 de ranking, 4 de migraciones, 2 de upgrade de selección y 3 de composición oficial.                          |
| `git diff --check`                                                   | Sin problemas de whitespace.                                                                                                                 |

La actualización adapta los fixtures a propuestas versionadas, capitanes reales,
asociación de candidatos, confirmación rival y resolución de disputas. Los resultados
se persisten mediante `append` y `markVoided`, preservando revisiones e historial.
Confirmación y resolución adquieren el lock de competición antes del lock de encuentro,
al igual que anulación; replays no vuelven a proyectar. La migración del ranking se
renumeró a `0047`, conservando los nombres de migraciones ya integradas en `main`.

Postgres se comprobó contra el destino de desarrollo configurado, usando exclusivamente
schemas de prueba aislados y eliminándolos al terminar. Los casos ejercitan los adapters
reales y la composición de `createModules`, no un publisher ni una transacción simulada.

La integración cubre tres aprobaciones concurrentes en encuentros distintos
(incluida resolución por operador), replay de confirmación sin duplicar resultados, rebuild
completo/replay con las mismas filas/fingerprint, tenant mismatch, CAS stale, fallo
después de persistir el ranking con rollback de aprobación/selección/contribuciones
por confirmación y por resolución, rollback de anulación, corrección concurrente con rebuild total, evento viejo después
de corrección/void y rollback del rebuild total después de borrar/reinsertar proyecciones.
El fetcher de esa composición lanza si se intenta consultar EA.

Las pruebas de política verifican los scores literales 95/5, 100/0 y empate 40/40,
neutralidad de DG igual, el efecto de una corrección sobre otros comparables, nulls,
denominador cero, counts inválidos, muestra por encounters, forma de cinco, orden
temporal estable, stages mixtos, series agregadas y byes sin marcadores sintéticos.
Una regresión con DG fraccionaria verifica extremos exactamente 0/100, evitando
desbordamientos de precisión como `100.00000000000001` en el contrato HTTP.
HTTP verifica identidad/permisos/scope, ausencia inicial, no_data después de rebuild,
incomplete tras void, respuesta sanitizada y compatibilidad de standings/kinds.

Los casos remotos usan límites ampliados para la latencia del destino de desarrollo.
El runner raíz muestra un aviso de cierre tardío después de completar los tests y
termina con código 0. No se atribuye rollback durable a la memoria, ni se declara
verificado un flujo vivo Better Auth → BFF → API: para BFF la evidencia es generación
de ruta, typecheck y bundle. El rebuild funciona sin red de proveedor; no se verificó
una integración EA nueva ni un deploy.
