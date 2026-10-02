# ADR-0022: Perfil de organización: slug, zona horaria y escudo

- Estado: Aceptada
- Fecha: 2026-10-01
- Relacionado: [ADR-0020](/docs/adr/0020-competition-profile-and-media.md) · [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md) · [ADR-0011](/docs/adr/0011-tagged-errors.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

`Organization` solo guarda nombre. No tiene identificador legible para una futura URL pública,
no sabe en qué zona horaria opera y se muestra con un icono genérico en el selector de espacio.
Cada competición nueva pide la zona horaria desde cero y no existe una pantalla para editar la
organización: `/orgs/$orgId/settings` es un scaffold vacío y no hay `GET` ni `PATCH` de
organización. Los requisitos nuevos son FTR-ORG-003 a FTR-ORG-005; las decisiones, DEC-082 a
DEC-087 en [open-decisions](/product/open-decisions.md).

## Decisión

`Organization` suma tres campos construidos solo por parsers de dominio en `@futrob/organizations`:

| Campo      | Forma                                                                | Invariante                                                              |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `slug`     | `OrganizationSlug`, `^[a-z0-9]+(-[a-z0-9]+)*$`, de 3 a 48 caracteres | Único globalmente; sin palabras reservadas                              |
| `timeZone` | Zona IANA                                                            | Obligatoria; validada con la misma función que las competiciones        |
| `logo`     | `{ kind: "monogram" }` o `{ kind: "upload", key: MediaKey }`         | Nunca nulo; por defecto monograma; la clave pertenece a la organización |

- **Slug.** `suggestOrganizationSlug(name)` lo deriva del nombre (sin diacríticos, minúsculas,
  separadores a `-`). Si no llega slug al crear, el caso de uso sugiere uno y añade un sufijo
  numérico hasta encontrar uno libre. Es editable con `organizations.update`.
- **Unicidad.** Se aplica en tres puntos y nunca depende solo de la interfaz: la UI comprueba la
  disponibilidad al salir del campo y antes de enviar; los casos de uso de crear y editar
  consultan `getBySlug` y devuelven `OrganizationSlugConflict`; el índice
  `organizations_slug_unique` rechaza la segunda escritura de una carrera y el adapter la traduce
  al mismo error. Al editar, el slug actual de la organización cuenta como disponible.
- **Zona horaria.** Es el valor inicial de las competiciones nuevas. Cambiarla no modifica las
  competiciones existentes.
- **Escudo.** Sin imagen propia se muestra un monograma generado del nombre; el dominio no conoce
  ilustraciones. La subida sigue ADR-0020: la web es dueña de R2, detecta el tipo por firma
  (PNG, JPEG o WebP, hasta 2 MB) y guarda en
  `organization-logos/{organizationId}/{uploadKey}.{ext}` mediante
  `PUT /api/v1/organizations/:orgId/logo/:uploadKey` (BFF), que antes confirma
  `organizations.update`. Después, `PUT /organizations/:orgId/logo` en la API registra la clave
  en la organización y rechaza una clave fuera de su prefijo (`organizations.invalid_logo`).
  Cada cambio usa una clave nueva y `GET /media/organization-logos/*` sirve el objeto con caché
  inmutable.
- **Errores esperados** (`TaggedError`): `organizations.invalid_slug`,
  `organizations.slug_conflict`, `organizations.invalid_time_zone` y
  `organizations.invalid_logo`.
- **Errores esperados** adicionales: `organizations.creation_key_conflict` (409).
- **Endpoints** (`/api/v1`): `POST /organizations` acepta `slug?`, `timeZone` y `creationKey?`;
  `POST /organizations/slug-availability`; `GET` y `PATCH /organizations/:organizationId`;
  `PUT /organizations/:organizationId/logo` (registra la clave subida). `MembershipSummary`
  incluye slug y escudo.
- **Onboarding y diálogo del selector** no añaden campos: la API deriva el slug del nombre y toma
  la zona horaria de la competición creada en el mismo paso o del navegador.
- **Migración `0045`.** Añade las columnas, rellena las organizaciones existentes (slug desde el
  nombre con sufijo ante colisión; zona de su competición más antigua o `UTC`; escudo monograma),
  y solo después aplica `NOT NULL`, los `CHECK` y el índice único.

## Consecuencias

- Las URLs públicas por slug podrán construirse sin otra migración, pero hoy el slug no tiene
  consumidor: no existen rutas de portal por organización.
- Cambiar un slug no deja redirecciones. Si el portal las necesita, requerirá historial de slugs y
  un ADR propio.
- Un escudo reemplazado queda huérfano en R2, la misma deuda de ADR-0020.
- Los campos nuevos de `MembershipSummary` y de la respuesta de creación son aditivos; los
  clientes móviles actuales no se rompen.
- Una clave de creación repetida devuelve la organización ya creada solo si nombre, zona y slug
  (cuando se envía) coinciden; con otros datos responde `organizations.creation_key_conflict`.
  El formulario web genera una clave nueva cuando el usuario cambia los datos tras un fallo.
- Las escrituras de perfil son parciales (`OrganizationChanges`): solo se escriben los campos
  enviados, de modo que dos organizadores que editan campos distintos a la vez no se pisan. Dos
  ediciones del mismo campo siguen siendo «gana la última».
- Crear con escudo propio requiere dos pasos (crear y subir), porque la clave de R2 incluye el
  `organizationId`. Si la subida falla, la organización ya existe y el escudo puede subirse desde
  ajustes. `creationKey` evita duplicar la organización en un reintento.

## Alternativas consideradas

- **Slug opcional.** Evita rellenar datos existentes, pero obliga al portal a manejar
  organizaciones sin URL. Un slug siempre presente simplifica a los consumidores.
- **Ilustraciones de escudo predefinidas.** Como las portadas de competición, pero añaden
  contenido de diseño sin una necesidad confirmada; el monograma cubre el caso sin imagen.
- **Subir el escudo antes de crear la organización.** Evita el segundo paso, pero deja objetos
  sin dueño en R2 si el usuario abandona el formulario o falla la creación.
- **Zona horaria opcional.** Obliga a cada competición a preguntarla sin valor de partida y
  permite organizaciones sin zona; la obligatoriedad con valor por defecto del navegador no añade
  fricción.

## Estado de implementación y evidencia

Aceptada por instrucción explícita del usuario (decisiones confirmadas el 2026-10-01).
Implementada en la rama `feat/org-create-form`.

- Dominio y casos de uso en `@futrob/organizations` (`organization-slug.ts`, `organization-logo.ts`,
  `CreateOrganizationUseCase`, `CheckOrganizationSlugUseCase`, `GetOrganizationProfileUseCase`,
  `UpdateOrganizationProfileUseCase`, `SetOrganizationLogoUseCase`) con pruebas de permisos,
  conflictos y carreras simuladas.
- Persistencia en `apps/api/src/adapters/organizations/` y migración
  `apps/api/migrations/0045_organization_profile.sql`.
- Contratos, OpenAPI, SDK, rutas de la API, CLI (`org-slug-check`, `org-profile`), BFF de la web
  (`/api/v1/organizations/:id`, `…/logo`, `…/logo/:uploadKey`, `/media/organization-logos/*`),
  formulario de creación, ajustes y escudos en el selector, el selector de organización y la zona
  inicial de las competiciones.

Verificado de verdad:

- Suite completa de Vitest, `vp check`, `typecheck` y `vp build`.
- Migración: instalación limpia de las 45 migraciones en un Postgres real (base aislada de Neon) y
  backfill sobre datos existentes en Postgres embebido (PGlite): slugs con tildes, colisiones,
  nombres cortos y reservados, zona de la competición más antigua o `UTC`. Las restricciones
  rechazan slug duplicado, mal formado y logo inconsistente.
- Flujo en vivo con navegador contra la web, el auth y la API de la rama y una base aislada:
  creación con slug propuesto, escudo subido a R2 local y servido con caché inmutable, slug ocupado
  con sugerencia, edición en ajustes, `409 slug_conflict` y `400 invalid_slug` desde la API,
  retirada del escudo, zona heredada en una competición nueva, monogramas en el selector y
  formulario sin desbordamiento a 375 px.

Brechas:

- `organization-profile.migration.integration.test.ts` (con `TEST_DATABASE_URL`) no se ejecutó
  completo: contra Neon remoto agota los tiempos de espera al aplicar 45 migraciones. Se validó
  con las otras vías de arriba.
- El slug no tiene consumidor: no existen rutas del portal público por organización.
- Los escudos reemplazados quedan huérfanos en R2, como las portadas de ADR-0020.
- La app móvil acepta los campos nuevos, pero no muestra el escudo ni edita el perfil.
