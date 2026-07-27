# Futrob — Especificación del sistema de diseño

**Estado:** canónico para el MVP (producto 2026-07)  
**Alcance:** landing, aplicación autenticada y portal público responsive  
**Base técnica:** Tailwind CSS, shadcn sobre Base UI, lucide, light/dark

## 1. Dirección visual

### Concepto: mesa de operaciones de competición Clubs

Futrob debe sentirse como el sistema operativo de una liga EA FC Clubs: preciso para organizadores y capitanes, claro para espectadores, y anclado a datos reales de partidos.

La idea memorable es **“del partido EA al resultado oficial”**. El énfasis visual está en candidatos, selección, marcador y avance competitivo — no en OCR ni evidencia fotográfica.

### Principios

1. **Filas antes que tarjetas.** Enfrentamientos, candidatos EA, plantillas y rankings como listas densas. Cards solo para entidades autónomas o herramientas enmarcadas.
2. **Marcador como ancla.** Números tabulares, alto contraste, posición estable.
3. **Densidad graduada.** Operación compacta en desktop; táctil ≥ 44 px en móvil.
4. **Estado explícito.** Texto + icono/forma; el color es suplementario.
5. **Espectáculo subordinado a legibilidad.** Hero, live y bracket pueden tener más presencia; formularios y revisión permanecen sobrios.
6. **Un solo lenguaje de componentes.** shadcn/Base UI para comportamiento; tokens Futrob para identidad.

### Anti-patrones

- Dashboard de cards uniformes sin jerarquía.
- Gradiente púrpura genérico, glassmorphism global o sombras en cada bloque.
- Confundir goles de partido con resultado agregado de serie.
- Badges solo por color.
- Tratar candidatos EA como resultados oficiales visualmente iguales.
- Nested cards.

## 2. Identidad y lenguaje

- Nombre visible: **Futrob**.
- Promesa: operación confiable de ligas y copas EA SPORTS FC Clubs con datos de EA.
- Terminología UI (es): Organización, Competición, Equipo, Plantilla, Enfrentamiento, Partido oficial, Partido EA, Candidato, Serie, Reprogramación, Disputa, Tabla, Bracket, Ranking.
- Estados concretos: “Esperando datos de EA”, “Candidatos disponibles”, “Selección en progreso”, “Esperando confirmación rival”, “Confirmado”, “En disputa”, “En revisión”, “Aprobado”, “Anulado”.
- Evitar promesas de automatización perfecta del API de EA.

## 3. Tipografía

Familia única autohospedada WOFF2: **Manrope** (variable 400–700). La jerarquía es por rol, no por familia.

| Rol   | Clase Tailwind | Uso                                              |
| ----- | -------------- | ------------------------------------------------ |
| Hero  | `type-hero`    | Headline de landing / superficies de marca       |
| Title | `type-title`   | Títulos de página, competición, paneles          |
| Body  | `type-body`    | Párrafos y copy de apoyo                         |
| Label | `type-label`   | Labels uppercase densos, estados, metadata corta |
| Score | `type-score`   | Marcadores y valores numéricos que cambian       |

Tokens de rol en [`packages/ui/src/tokens.css`](/packages/ui/src/tokens.css); utilidades en [`apps/web/src/styles.css`](/apps/web/src/styles.css) (`@utility`). Marcadores usan `font-variant-numeric: tabular-nums` vía `type-score`.

## 4. Color y tokens

- Tokens semánticos CSS (`--background`, `--foreground`, `--primary`, `--success`, `--warning`, `--danger`, `--muted`, etc.) como única fuente de color de componentes.
- Verde = acción primaria, estado aprobado o camino ganador; no decoración ambiental.
- Dark es la presentación deportiva principal; light permanece completo.
- Objetivo WCAG 2.2 AA.
- Separación default: borde 1 px; sombra solo en capas modal/popover.
- Tres niveles de borde: `--border-subtle` dentro de un grupo, `--border` como separador default, `--border-strong` para estructura. `--input` y `--border-strong` cumplen ≥ 3:1 contra su superficie (criterio 1.4.11).
- `--muted`, `--surface` y `--secondary` son escalones distintos en ambos temas; ninguna zona puede quedar invisible sobre su contenedor.
- Paleta canónica **Pitch Ops** en OKLCH: escala verde `--brand-50` a `--brand-950`, neutros con tinte de campo y escalas semánticas red/amber/blue.
- Implementación: [`packages/ui/src/tokens.css`](/packages/ui/src/tokens.css). Uso de logo y activos: [`docs/brand/README.md`](/docs/brand/README.md).

Estados de selección/sync deben mapear a tokens semánticos distintos de “oficial/aprobado”.

## 5. Layout shells

### Landing

Navegación ligera + hero de marca dominante + una composición de producto. Sin stats inventadas ni cards en el primer viewport.

### App autenticada

- Desktop: sidebar contextual ~264 px, header de app, header de página, filtros, contenido fluido.
- Tablet: rail ~72 px.
- Mobile: top bar + hasta 5 destinos bottom.
- El page header no es una card decorativa.

Geometría y controles: la rampa de esquinas `--corner-*` y la rampa de altura `--control-height-*` viven en `packages/ui/src/tokens.css` y son fuente única. Los controles son compactos en desktop (24–36 px) y crecen a `--control-height-touch` (44 px) por debajo del breakpoint `sm`, dentro de la primitiva y no por parche en cada pantalla.

### Portal público

Header de competición + tabs horizontales sticky; sin sidebar admin.

## 6. Match Center y filas

### EncounterRow

Zonas desktop: jornada/fecha · Team A · marcador/estado centrado · Team B · metadata/acción.  
Mobile: dos filas de equipo + contexto de serie/reprogramación/selección.

### Detalle

Cabecera simétrica de marcador + secciones: Overview, Official matches, EA candidates, Selection, Schedule, Stats, History/Admin.

La lista de candidatos debe mostrar hora, resultado, duración, local/visitante, jugadores clave y estado de uso (libre / propuesto / asignado / aprobado).

Preview de selección: resultado por partido y, si aplica, agregado etiquetado explícitamente.

## 7. Bracket y rankings

- Bracket de eliminación consume grafo semántico; layout es presentación.
- Debe existir vista lista accesible equivalente.
- Rankings: tablas densas con elegibilidad visible (“No elegible — minutos insuficientes”).
- Tabla oficial y ranking de rendimiento nunca comparten el mismo título ambiguo.

## 8. Movimiento y accesibilidad

- Respetar `prefers-reduced-motion`.
- Focus visible; diálogos restauran foco.
- Estados live/sync no roban foco ni reordenan en silencio.
- Contraste AA; no transmitir estado solo con color.
- Locales `es`/`en` sin cambiar reglas de datos EA.

## 9. Referencias de implementación

- Primitivas: `packages/ui` (shadcn/Base UI).
- Composiciones de negocio: `apps/web/src/features/*`.
- Criterios UX: [ux-acceptance.md](/product/ux-acceptance.md).
