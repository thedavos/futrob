# ADR-0007: Observaciones de proveedor inmutables en Postgres

- Estado: Aceptada
- Fecha: 2026-07-17
- Actualizada: 2026-09-22
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Futrob necesita auditar y reprocesar observaciones sin reemplazar el contenido original.
El modelo neutral se conserva; la implementación actual usa Postgres en la API,
en lugar del almacenamiento D1/R2 descrito en la decisión inicial.

## Decisión

`game-data` posee `raw_provider_observations`. Cada observación conserva identidad de
proveedor/recurso, endpoint, hash de payload, referencia de almacenamiento, JSON,
fecha de observación, estado HTTP y versión de esquema.

El payload raw es inmutable. La clave única actual es
`(provider_key, resource_type, external_resource_id, payload_hash)`: recibir el mismo
contenido reutiliza la observación; un hash diferente permite una nueva observación.
No equivale a registrar cada intento HTTP: la telemetría operativa tiene otro propósito.

`provider_matches` contiene el modelo normalizado y puede actualizarse según nuevas
observaciones. La inmutabilidad del raw no congela la proyección normalizada. El modelo
admite reprocesamiento cuando hay datos suficientes, sin afirmar que exista un pipeline
general de replay completo.

La implementación persiste `payload_json` como JSONB y `storage_ref` en Postgres.
Mover blobs grandes a R2 es una posible evolución: requiere definir escritura/lectura,
fallos y retención; el binding R2 por sí solo no demuestra esa integración.

## Consecuencias

- Hay trazabilidad entre adquisición y normalización sin depender de reconsultar EA.
- Raw y telemetría/portal tienen contratos distintos: no se exponen payloads privados.
- Deben definirse periodos, borrado y ejecución de retención antes de afirmar que existe
  una política operativa completa. La inmutabilidad durante la retención no exige guardar para siempre.

## Alternativas descartadas

Tablas exclusivas `ea_raw_*`; sobrescribir el raw al normalizar; presentar la presencia
de un hash o de R2 como prueba suficiente de replay, retención o control de acceso.

## Estado de implementación y evidencia

La tabla Postgres, deduplicación y adapters existen; offload a R2 y una política completa
de retención no se dan por implementados en este ADR.

- [Migración](/apps/api/migrations/0019_provider_observations_and_matches.sql).
- [Adapter Postgres](/apps/api/src/adapters/game-data/persistence/postgres.repository.ts).
- [Modelo neutral](/docs/adr/0006-game-data-provider-port.md).
