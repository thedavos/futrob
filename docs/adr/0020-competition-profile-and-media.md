# ADR-0020: Perfil de competición y portadas en R2

- Estado: Aceptada
- Fecha: 2026-09-28
- Relacionado: [ADR-0001](/docs/adr/0001-monorepo-and-tanstack-start-deployable.md) · [ADR-0019](/docs/adr/0019-competition-registration-and-applications.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Crear una competición solo pedía identidad y formato. El organizador no podía
fijar cuántos equipos acepta, cuándo empieza o termina, ni cómo se ve en
Explorar. El mínimo de equipos para publicar estaba fijo en dos. La web ya tiene
el binding R2 `MEDIA_BUCKET` (ADR-0001), pero la API de producto corre en Node y
no puede usarlo.

## Decisión

`Competition` suma tres value objects construidos solo por parsers de dominio:

| Campo      | Forma                                                              | Invariante                                 |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `teams`    | `{ min, max \| null }`                                             | `2 ≤ min ≤ max ≤ 256`; `min` por defecto 2 |
| `schedule` | `{ startsOn, endsOn }` como `CalendarDate` o `null`                | Si hay dos fechas, `endsOn ≥ startsOn`     |
| `cover`    | `{ kind: "preset", preset }` o `{ kind: "upload", key: MediaKey }` | Nunca nula; por defecto el preset `cup`    |

- Publicar exige `approved ≥ teams.min`. El cupo máximo bloquea aprobar,
  registrar como aprobado y postular (`competitions.capacity_reached`).
- `teams` y `schedule` se editan solo en `draft`. La portada es presentación:
  `PUT …/cover` la cambia en cualquier estado salvo `archived`.
- El dominio conoce solo los ids de preset. La web mapea cada id a su
  ilustración `trophy-*`.

**Portadas subidas.** La web es dueña de los medios:

1. El formulario muestra una vista previa local y no sube nada hasta enviar.
2. `PUT /api/v1/organizations/:orgId/competitions/covers/:creationKey` (BFF)
   confirma `competitions.update` contra la API, detecta el tipo por la firma
   del archivo (PNG, JPEG o WebP, hasta 2 MB) y guarda en
   `competition-covers/{orgId}/{creationKey}.{ext}`.
3. La creación usa el mismo `creationKey`: un reintento sobrescribe el objeto
   y devuelve el mismo borrador.
4. La API rechaza una `key` fuera del prefijo de la organización
   (`competitions.invalid_cover`).
5. `GET /media/competition-covers/*` sirve el objeto con
   `cache-control: public, max-age=31536000, immutable`. Cada cambio de
   portada usa una clave nueva.

## Consecuencias

- Migración `0041_competition_profile.sql` con restricciones de rango y fechas.
- Las portadas son públicas por URL. Las claves no son adivinables, pero no
  requieren sesión.
- Una portada reemplazada queda huérfana en R2. Falta una limpieza periódica.
- No se redimensiona en el servidor. La UI usa `object-fit: cover`.

## Alternativas consideradas

- **Subir desde la API.** Requiere credenciales S3 de R2 en Railway y duplica
  el dueño de los medios.
- **Subir al elegir el archivo.** Deja objetos huérfanos si el usuario abandona
  el formulario.
- **Campos opcionales sueltos (`minTeams`, `maxTeams`, `startsOn`, `endsOn`).**
  Permiten combinaciones inválidas que los parsers ahora descartan.

## Estado de implementación y evidencia

- Dominio y tests en `@futrob/competitions`; contratos, SDK y OpenAPI.
- `apps/web/src/shared/infrastructure/media/media-storage.ts` con
  tests, verificado contra el R2 local de Wrangler (`getPlatformProxy`).
- Migraciones `0001`–`0041` aplicadas en Postgres 16 local y flujo HTTP
  completo verificado contra esa base.
- Stories de creación (`Product/Organizer/Competitions/Create`) y de Explorar.
