# Futrob — Design

**Estado:** contrato único de diseño. **Actualizado:** 2026-09-06.
**Alcance:** marketing, producto web, portal público y aplicación nativa.

Este documento reúne identidad, arquitectura de información, composición, componentes,
implementación y aceptación UX. Toda decisión de diseño se mantiene aquí. Storybook es su
referencia ejecutable; los contratos funcionales y de dominio permanecen en `product/`.
La solicitud vigente del usuario prevalece sobre este contrato. Los valores ejecutables viven
exclusivamente en `packages/ui-tokens/src`; `packages/ui/src/tokens.css` es generado.
Si código y documento difieren, resolver la discrepancia explícitamente sin crear otro tema local.

## Cómo diseñar una pantalla

1. Identificar actor, contexto activo, datos disponibles y tarea principal. Distinguir consulta
   personal de operación competitiva y publicación pública.
2. Elegir jerarquía y estructura: cabecera, filtros, secciones y representación de datos.
   Consultar los patrones de Mis estadísticas, Mis partidos y detalle antes de componer.
3. Implementar con primitivas existentes y tokens semánticos; conservar permisos, estados,
   navegación de regreso y contratos de datos. Las composiciones de negocio viven en la app.
4. Verificar estados pertinentes en Storybook, anchuras estrechas, teclado, ES/EN y ambos
   selectores de tema. El trabajo termina cuando los criterios UX aplicables se cumplen,
   el CSS generado está sincronizado y las comprobaciones requeridas pasan.

## Identidad y dirección

Futrob es una mesa de operaciones de competición de EA SPORTS FC Clubs: precisa, rápida,
confiable y deportiva. La promesa es «del partido EA al resultado oficial». El organizador
resuelve pendientes; el capitán selecciona y confirma; el jugador entiende su rendimiento;
el espectador sigue contenido publicado. Cada superficie jerarquiza esas tareas.

La identidad visual vigente es **Grafito + Lima**. La profundidad procede de superficies
sobrias, separación, tipografía y alineación. Las filas y tablas organizan partidos, plantillas,
auditoría y rankings. Las tarjetas contienen entidades autónomas, herramientas o stats
resumidas como las de Mis estadísticas. Una acción primaria por contexto; las acciones
destructivas se separan y confirman. El estado siempre tiene texto más icono o forma.

Evitar tarjetas anidadas, grids de tarjetas para toda clase de contenido, degradados
ornamentales, glassmorphism, colores arbitrarios y sombras en controles estáticos.
Los overlays y las variantes elevadas usan `elevation.sm|md|lg` sin borde adicional.
Una fotografía puede llevar una capa de contraste para mantener legible el texto.

## Paleta y tema único

Grafito + Lima es el valor predeterminado en todas las superficies. `:root`, `.light`,
`[data-theme="light"]`, `.dark` y `[data-theme="dark"]` producen la misma paleta y
`color-scheme: dark`. La web declara `data-theme="dark"`; la app nativa usa chrome oscuro
con texto claro en la barra de estado. La preferencia del sistema no cambia los colores.
Un tema claro real queda para una decisión futura; no presentar ahora un selector que prometa
una apariencia diferente. Los alias `LIGHT_THEME` y `DARK_THEME` referencian
`GRAPHITE_LIME_THEME`, sin dos mapas de valores mantenidos por separado.

| Uso                             | HEX sRGB  | Token semántico                                         |
| ------------------------------- | --------- | ------------------------------------------------------- |
| Fondo general, grafito profundo | `#101214` | `background`                                            |
| Sidebar y encabezado, grafito   | `#141719` | `sidebar`                                               |
| Tarjetas, gris carbón           | `#1C2023` | `surface`, `card`, `secondary`                          |
| Superficie elevada / hover      | `#262C30` | `surface-raised`, `popover`, `muted`, `secondary-hover` |
| Bordes y divisores, pizarra     | `#343B40` | `border`, `border-subtle`                               |
| Texto principal, blanco frío    | `#F5F7F8` | `foreground`, `card-foreground`                         |
| Texto secundario, gris claro    | `#ADB5BD` | `muted-foreground`                                      |
| Principal, lima                 | `#CAFF35` | `primary`, `ring`                                       |
| Hover principal, lima suave     | `#D8FF70` | `primary-hover`                                         |
| Fondo de selección e iconos     | `#293514` | `accent`                                                |
| Texto e iconos de selección     | `#CAFF35` | `accent-foreground`                                     |
| Texto sobre lima                | `#101214` | `primary-foreground`                                    |
| Victoria / éxito                | `#4ADE80` | `success`                                               |
| Resultado oficialmente aprobado | `#4ADE80` | `approved`, `status-approved`                           |
| Empate / advertencia / revisión | `#FBBF24` | `warning`, `status-selection`                           |
| Derrota / error / disputa       | `#F87171` | `danger`, `status-dispute`                              |
| Información / sincronización    | `#60A5FA` | `info`, `status-sync`                                   |
| MVP / reconocimiento            | `#FFD166` | `emphasis`                                              |
| Cancelación                     | `#ADB5BD` | `status-cancelled`                                      |

Lima se concentra en botones principales, navegación activa y detalles destacados.
Las tarjetas permanecen en grafito y los números en blanco. Los estados pueden colorear
su texto, icono o indicador, con una etiqueta explícita; no teñir todos los valores de una stat.
`approved` conserva semántica propia aunque comparta verde con éxito: una victoria EA
no demuestra aprobación oficial. `emphasis` expresa reconocimiento, nunca aprobación.
Los escudos de clubes mantienen sus colores originales, sin filtros ni recoloración.

Los fondos sólidos de estado usan texto grafito (`*-foreground`); las variantes sutiles
mantienen fondo grafito y texto de estado. Los gráficos usan `chart-*` con etiquetas,
leyendas o formas diferenciables; el color no es la única codificación.

### Contraste

Objetivo WCAG 2.2 AA: 4.5:1 para texto normal y 3:1 para información no textual necesaria.
`border` es un divisor estructural sutil, no el único indicador de un control. Los controles
usan `input` / `border-strong` (`#ADB5BD`) cuando necesitan un límite reconocible; el foco
usa lima. Mantener la paleta propuesta: resolver contraste mediante el rol correcto y la
composición. Medir el par renderizado, incluidas mezclas y opacidad, antes de declarar AA.

### Fuente de tokens y generación

- `packages/ui-tokens/src/scales.ts`: colores sRGB del brief convertidos a OKLCH con precisión
  suficiente para recuperar el HEX exacto; solo colores de la paleta vigente.
- `theme.ts`: asignación semántica única. Los alias light/dark mantienen compatibilidad.
- `typography.ts`, `geometry.ts`, `motion.ts`: roles, medidas, duración y capas compartidos.
- `packages/ui/src/tokens.css`: artefacto generado. Nunca editar valores aquí a mano.
- `themeToHexColors()` resuelve referencias a HEX para React Native y generadores de activos.
  `resolveThemeColor()` recorre alias; `oklchToHex()` convierte a sRGB.

Editar TS, ejecutar `npm run generate:css -w @futrob/ui-tokens` y guardar ambos cambios.
`npm run generate:css:check -w @futrob/ui-tokens` y los tests de paridad impiden divergencias.
Los componentes consumen tokens semánticos, nunca escalas crudas ni temas locales.
Iconos, splash, manifest y metadata deben usar la misma identidad.

## Fundamentos y componentes

### Tipografía

Familia única autohospedada: **Manrope Variable**. Pesos canónicos: 400, 500, 600 y 700.

| Rol      | StyleX                | Uso principal                                                  |
| -------- | --------------------- | -------------------------------------------------------------- |
| Display  | `typography.display`  | Headlines de marketing                                         |
| Heading  | `typography.heading`  | Títulos de página y panel                                      |
| Subtitle | `typography.subtitle` | Frase de apoyo bajo un heading                                 |
| Body     | `typography.body`     | Párrafos y contenido de lectura                                |
| Label    | `typography.label`    | Labels de formulario, navegación, columnas y estados compactos |
| Caption  | `typography.caption`  | Hints, metadata, timestamps y texto secundario sentence-case   |
| Score    | `typography.score`    | Marcadores y valores deportivos con cifras tabular             |

`typography.label` es el contrato predeterminado para etiquetas de formulario y navegación.
`typography.caption` cubre metadata y ayudas; el color secundario se aplica con tokens
(`colors.mutedForeground`), no con otro rol. Los estilos viven en
`packages/ui/src/styles/typography.ts`; los valores viven en `packages/ui/src/tokens.css`.
Ver «Implementación web con StyleX» en este documento.

### Geometría y densidad

- Altura universal de controles: `--control-height` = **44 px**.
- `dense` es la única reducción permitida: `--control-height-dense` = **36 px** en interfaces
  operativas de desktop.
- En pantallas touch, `dense` vuelve a **44 px**.
- No existen tamaños `xs`, `sm` o `lg` para controles. `size` solo expresa forma:
  `default` o `icon`.
- Esquinas, espacios, duraciones y capas provienen de tokens. No crear rampas paralelas.
- En móvil la unidad es **dp/pt** con equivalencia `1rem = 16`; ver sección [8](#8-móvil-appsmobile).

## Contrato de primitivas

Las primitivas viven en `@futrob/ui`, no conocen competiciones, EA, roles ni permisos y exponen
variantes cerradas.

### Texto

Primitivas que aplican los roles `typography.*`. El elemento semántico (`as`) elige el tag;
el look desciende con el nivel.

- `Display` — headlines de marketing (`h1` por defecto; `PageHeaderTitle` es el `h1` de producto; `size="lg"` 30→36px en homes de producto)
- `Heading` — títulos de panel (`h2`–`h6`; `h2`/`h3` usan `typography.heading`, `h4`–`h6` usan `typography.subtitle`)
- `Subtitle` — frase de apoyo; `tone` `muted` por defecto
- `Body` — cuerpo flexible (`size` `sm` 12px · `md` 14px · `lg` 16px); `measure` opt-in para lectura (65ch); `weight` / `tone` / `align`
- `Text` — prosa/chrome flexible (`look` `body` \| `caption` \| `label` \| `subtitle`; `as` `span` por defecto). Títulos y marcador van en `Display` / `Heading` / `SectionTitle` / `Score`
- `Caption` — metadata y hints sentence-case; `tone` `muted` por defecto
- `Score` — cualquier cifra que cambia (marcador, %, conteo, celda); `align` `start` \| `center` \| `end`; `tone` `muted` para no disponible (`—`). El color de estado vive en `StatValue`
- `Eyebrow` — kicker sobre un título (`typography.label` muted). No es un `<label>`
- `SectionTitle` — heading semántico (`h2`–`h4`) con look de label (“Rendimiento”, “Atributos”)
- `TextLink` — enlace de texto (no `Button variant="link"`); `text` `body` \| `caption` \| `label`; `render` para el router
- `MetaList` — `dl` de metadata (`MetaItem` + `MetaTerm` + `MetaValue`); `columns` `1` \| `2`
- `Label` — `<label>` de formulario. Navegación y columnas reutilizan el rol vía `FieldLabel` / `TableHead`

No inventar tamaños fuera de la rampa (`text-xs`…`text-7xl`) ni un `Text` con `size` 1–9.
`Body size` solo `sm`/`md`/`lg`. Títulos y cifras siguen en `Display` / `Heading` / `SectionTitle` / `Score`.

### Formularios

- `Form`
- `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldValidity`
- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
- `ChoiceGroup` para selección única con apariencias cerradas `tile` y `pill`
- `Alert`
  - `variant`: semántica (`default` | `info` | `success` | `warning` | `destructive`).
  - `elevation="flat"` (default) con borde; `elevation="elevated"` usa `elevation.md`
    sin border (paneles de aviso aislados, no alerts inline en forms densos).

Cada campo debe tener nombre accesible, descripción/error asociado y estado inválido visible.
Los formularios muestran validación junto al campo y un resumen solo cuando aporta contexto.

### Navegación

- `Tabs` con variantes cerradas `line` (indicador lineal, default) y `pills` (segmento relleno)
- `Breadcrumb`
- `Sheet` para navegación móvil
- `Stepper` para progreso secuencial no interactivo
- `Collapsible` para secciones expandibles de detalle (Encounter, filtros, historial)

La navegación de producto usa `typography.label`. El estado activo no depende únicamente del color.

### Datos

- `Table` y primitivas de fila/celda
- `Badge` con variantes `approved` (solo resultados oficiales) y `emphasis` (acento categórico; no es un estado)
- `Card` para entidades o resúmenes autónomos
  - `variant="flat"` (default): borde estructural, sin elevación.
  - `variant="elevated"`: `elevation.md`. Sin `border`/`ring` en el mismo elemento.
    Solo entidades autónomas sobre fondo plano. No usar en grids densas, forms ni cards anidadas.
- `EmptyState`
  - `variant="flat"` (default): borde dashed.
  - `variant="elevated"`: `elevation.md` para paneles vacíos aislados.
- `Skeleton`
- `Stat` (KPI): `StatLabel` + `StatValue` + `StatHint` opcional; `StatGroup` para strips.
  - `StatValue` size: `default` (`typography.score`) | `compact` (strip denso) | `empty` (`typography.caption` para ausencia textual).
  - `tone`: `default` | `muted` | `success` | `warning` | `error` (`error` → token danger).
    `muted` para valores no disponibles (`—`). El color no comunica solo; acompaña label/hint.
    El formateo (locale, `%`, miles) es de la presentación; el primitivo no conoce dominio.
- `ScrollArea` para listas densas y overflow controlado
- `Progress` para sync/jobs con estado explícito (texto + barra; `value={null}` = indeterminado)

`Table dense` es el patrón recomendado para auditoría y operación en desktop. Las cifras usan
`tabular-nums`. Toda tabla debe tener encabezados y una representación móvil legible.

### Overlays

- `Dialog` / `AlertDialog`: `elevation.lg` (sin border en el popup).
- `Popover` / `SelectContent`: `elevation.md`.
- `Sheet`: `elevation.lg` (sin border perimetral; divisores internos sí).
- `Tooltip`: sombra suave sin ring (no lleva borde).

Base UI debe conservar focus trap, restauración de foco, Escape y asociación de título y
descripción. No mezclar borde + sombra en el mismo elemento.

### Botones

Variantes cerradas: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`.

- `default`: acción primaria de marca.
- `secondary`/`outline`: acciones de apoyo.
- `ghost`: acciones de baja prominencia.
- `destructive`: solo con semántica destructiva; normalmente dentro de confirmación.
- `ButtonIcon`: isla circular distintiva exclusiva para CTA de marketing. No usarla en tablas,
  toolbars ni formularios operativos.

### Iconos

- Librería canónica: **Phosphor Icons** (`@phosphor-icons/react`).
- Importar siempre el export con sufijo `Icon` (p. ej. `EnvelopeSimpleIcon`). Los nombres
  sin sufijo están deprecados en Phosphor ≥ 2.1.8.
- Peso por defecto: `regular`. No mezclar `duotone`/`fill` en UI operativa sin decisión de diseño.
- Tipar props de icono con `Icon` reexportado desde `@futrob/ui`.
- Inventario ejecutable: Storybook `Primitives/Icons` (`FUTROB_ICON_CATALOG`).

## Composición de producto

- `packages/ui`: tokens y primitivas agnósticas.
- `apps/web/src/modules/<context>/presentation`: componentes y flujos de negocio.
- Una pantalla puede decidir composición y contenido, pero no inventar nuevas variantes de
  primitivas mediante clases.
- El layout autenticado prioriza navegación contextual, header de página, filtros y contenido
  fluido. El portal público usa header de competición + tabs, sin sidebar administrativa.

## Movimiento y accesibilidad

- Animar solo `opacity`, `translate`, `scale` y, cuando es imprescindible, tamaño del indicador.
- Respetar `prefers-reduced-motion`; los tokens de duración pasan a `0ms`.
- Focus visible en todos los controles.
- Objetivos táctiles de al menos 44 px.
- Estados live/sync no roban foco ni reordenan silenciosamente.
- Debe existir alternativa de lista accesible para brackets visuales.

## Storybook y control de calidad

Storybook es la referencia ejecutable de las primitivas y contiene escenarios de botones,
formularios, navegación, data tables y overlays.

```bash
npm run storybook
npm run storybook:build
```

Una primitiva nueva o una variante modificada requiere:

1. Story de estado normal, disabled, invalid o empty cuando aplique.
2. Revisión de Grafito + Lima en ambos selectores de tema y del modo `dense`.
3. Panel a11y sin violaciones conocidas.
4. `npm run typecheck`, `npm run check` y build de Storybook.

## Patrones de pantallas y secciones

### Jerarquía de texto y ritmo

| Nivel                                       | Primitiva / rol                        | Regla                                                                                                  |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Título de pantalla                          | `PageHeaderTitle`                      | Un h1; «Mis estadísticas» o «Mis partidos». Detalle admite h1 accesible con marcador como foco visual. |
| Apoyo al título                             | `PageHeaderDescription` / `Subtitle`   | Orientación útil, no repetición de datos ya presentes.                                                 |
| Sección deportiva                           | `SectionTitle` h2 / `typography.label` | «Rendimiento», «Comparación», «Destacados», «Atributos».                                               |
| Panel de lectura                            | `Heading`                              | h2–h6 según estructura; evitar saltos de nivel por apariencia.                                         |
| Filtros, pestañas, columnas, nombre de stat | `typography.label` / `StatLabel`       | Identificación compacta y consistente.                                                                 |
| Cifra principal                             | `Score` / `StatValue`                  | Blanco, cifras tabulares y formato local; iguales escalas para métricas pares.                         |
| Celdas numéricas                            | `Score` con escala de tabla            | Alineación compartida con el encabezado; nunca tamaño de KPI dentro de una fila.                       |
| Explicación                                 | `Body` / `typography.body`             | Lectura; longitud cómoda, sin reducir tamaño para forzar una composición.                              |
| Fecha, muestra, unidad, ayuda               | `Caption` / `StatHint`                 | Contexto secundario cerca del dato al que pertenece.                                                   |

Una sección responde una pregunta y tiene título, contenido y contexto cuando aporta significado.
Compartir bordes de alineación; el padre es dueño del gap. Ritmo de referencia: 4 px entre
label/valor/hint, 12 px entre icono y bloque textual, 16 px dentro de paneles y entre stats,
24 px entre paneles relacionados y 32 px entre grandes grupos. Consumir la rampa de tokens,
no acumular margins para compensar una estructura incorrecta. `min-width: 0` en celdas flex/grid.

### Stats: referencia canónica de Mis estadísticas

La composición de `PlayerProfileKpis` en
`apps/web/src/modules/statistics/presentation/player-profile/player-profile-kpis.tsx`
es la referencia para nuevas stats resumidas. `Stat` es la primitiva; la composición de
icono, valor y contexto permanece en presentación de producto.

- Cuatro resúmenes pares: balance V–E–D con porcentaje de victorias, rating promedio,
  goles totales con promedio, asistencias totales con promedio.
- Grid de 1 columna estrecha, 2 desde `sm`, 4 desde `lg`; gap de 16 px.
- Panel gris carbón, borde pizarra de 1 px, `corner-lg`, padding de 16 px, sin sombra.
- Icono Phosphor regular de 32 px a la izquierda; stack textual a la derecha, gap de 12 px.
  Icono secundario por defecto; fondo oliva solo cuando una selección o énfasis lo justifica.
- `StatLabel` arriba, `StatValue` blanco como dato dominante y `StatHint` secundario debajo.
  El icono es decorativo: el label comunica el significado accesible.
- Ausencia = «—» o copy de no disponible en tono muted; un cero solo representa un cero real.
  Mantener unidades, periodo, tamaño de muestra, precisión y datos parciales explícitos.
- El valor no es un enlace. Si existe una acción, ofrecer un control separado con nombre claro.

Los KPI de Mis partidos (`SummaryCard`, balance y otras composiciones actuales) son
**legado pendiente de sustitución**. No extraer de ellos el patrón de nuevas stats ni
rediseñarlos durante esta migración. Sus colores sí heredan la paleta global.
Las stats compactas del detalle son datos de un partido; conservan esa densidad contextual.

### Mis estadísticas

Referencia: `player-profile/player-statistics-page.tsx` y sus stories.
Orden de lectura: PageHeader → identidad del jugador/club y filtro de periodo → cuatro stats
→ aviso de datos parciales cuando aplique → evolución y forma → atributos.
Evolución tiene más ancho que forma (1.9:1 en escritorio); en estrecho se apilan. Atributos
forman otra sección, no un grid de KPIs duplicados. La consulta conserva el periodo elegido.

La implementación actual consume `PlayerGameProfileDto` mediante `useMyGameProfileQuery`:
es rendimiento personal de partidos EA. No etiquetar esas observaciones como estadísticas
competitivas oficiales. Las proyecciones oficiales continúan requiriendo aprobación en `results`.
Esta distinción corrige la antigua descripción visual de esta pantalla como solo oficial,
sin modificar reglas del backend.

Estados: cargando perfil, error con reintento, falta de club, falta de cuenta de juego,
muestra vacía, datos parciales y perfil listo. El filtro sigue accesible durante estos estados.
Los gráficos tienen contexto temporal, muestra y alternativa textual/tabular; tooltips accesibles
por foco además de puntero. Desconocido no equivale a cero ni a una posición en el radar.

### Mis partidos

Referencia: `player-matches-page.tsx`, `player-matches-list.tsx` y `player-match-row.tsx`.
PageHeader → contexto/filtros → resumen existente (legado) → listado agrupado y ordenado.
La fila, no una tarjeta KPI, es la unidad de navegación. Mostrar ambos escudos y nombres,
marcador centrado, fecha, tipo, resultado desde el club seleccionado y participación personal.
El marcador y las métricas permanecen blancos; W/D/L se reconocen por texto/forma y color
verde/ámbar/rojo. Un reconocimiento usa `emphasis`; el acento lima identifica interacción.

Recientes y Todos son vistas de datos EA, no filtros de oficialidad. «No jugaste» conserva
la fila del club y oculta métricas personales que no existen. Los escudos mantienen identidad
y colores. La versión estrecha conserva ambos equipos, score y acción sin scroll de página.
Al volver del detalle, preservar vista, orden, filtros y posición. No colorear una fila entera
para expresar victoria ni llamar aprobado a un partido solo porque proviene de EA.

### Detalle del partido personal

Referencia: `provider-match-detail-page.tsx` y componentes `provider-match-detail-*`.
Breadcrumb Mis partidos → clubes; h1 accesible; fila de marcador compartida sin enlace
redundante ni franja personal; Tabs pills: Resumen, Jugadores y Datos del partido.

- **Resumen:** rendimiento personal (si existe aparición) y comparación de equipos, en dos
  columnas cuando el contenedor lo permite, apilados en estrecho; destacados debajo.
  Cada panel usa SectionTitle y separa métricas, unidades y ayudas. Sin aparición, no inventar
  una fila ni un panel de rendimiento; el marcador comunica «No jugaste».
- **Jugadores:** una plantilla por club; club seleccionado primero, rival después; rating
  descendente con valores desconocidos al final. Identidad, rol, rating y métricas legibles.
- **Datos del partido:** metadata como pares término/valor, sin convertirla en KPIs.
- Mantener cargando, falta de contexto, no encontrado y error recuperable como estados distintos.
  Un resumen cacheado no sustituye la consulta de las plantillas completas.

### Tablas, comparaciones y gráficos

`Table` con encabezados semánticos y caption accesible cuando haga falta identificar la tabla.
Texto a la izquierda; cifras y su encabezado alineados a la derecha, o score centrado cuando
la comparación deportiva lo exige. Todas las filas equivalentes comparten columnas, baselines,
unidades y precisión. Los nombres pueden envolver; no cortar datos decisivos para encajar.

La tabla ocupa el ancho necesario: mover una explicación arriba antes que comprimir columnas.
En touch priorizar identidad y cifras esenciales; scroll local solo cuando se necesita la matriz
completa. Mantener el acceso a columnas secundarias. Sorting visible y anunciado mediante
`aria-sort`; no reordenar silenciosamente por un refresh de sincronización.

Usar tablas para consulta exacta y gráficos para relaciones: tendencia temporal, comparación,
distribución o atributos. Toda barra comparable comparte escala y origen; longitud proporcional
al dato. Etiquetas, unidades, periodo y muestra junto a la evidencia. Mantener labels legibles,
sin falsa precisión y sin deducir valores ausentes. El ranking de rendimiento y la tabla oficial
se identifican por separado; brackets incluyen lista accesible y byes sin score ficticio.

## Arquitectura de información y flujos

### Principios

1. **Organización → competición → operación.** El shell deja claro el contexto activo.
2. **Enfrentamiento como centro operativo.** Calendario, partidos oficiales, candidatos EA, selección, reprogramación, disputa y auditoría se conectan desde un `Encounter` identificable.
3. **Una estructura competitiva, una modalidad piloto.** FC Clubs define labels y datos; futuras modalidades no deben forzar otra navegación base.
4. **Operar y observar son experiencias distintas.** La app autenticada privilegia excepciones y acciones; el portal privilegia seguimiento.
5. **Profundidad máxima práctica de tres niveles.** Organización, competición y recurso; tabs dentro del recurso para el resto.
6. **Estado preservado.** Volver del detalle conserva búsqueda, filtros, vista y scroll.
7. **Misma arquitectura de información, navegación propia por plataforma.** Web y mobile comparten destinos, vocabulario, permisos y contexto; no fuerzan el mismo chrome ni el mismo render tree.

### Mapa global

```text
Futrob
├── Landing pública
│   ├── Producto
│   ├── Cómo funciona (EA → candidatos → selección → oficial)
│   ├── Para organizadores / capitanes
│   └── CTA de acceso
├── Autenticación
├── Aplicación autenticada
│   ├── Espacio personal del jugador
│   │   ├── Mis partidos (Recientes + Todos)
│   │   │   └── Detalle de ProviderMatch
│   │   ├── Mis estadísticas
│   │   ├── Datos de juego
│   │   └── Invitaciones y organizaciones
│   ├── Inicio de organización
│   ├── Competiciones
│   ├── Equipos y jugadores de organización
│   ├── Notificaciones
│   ├── Organización / roles
│   └── Configuración personal
├── Aplicación móvil nativa
│   ├── Auth + onboarding
│   ├── Espacio personal del jugador
│   ├── Contexto de organización / competición
│   ├── Equipos, fixtures y Match Center
│   └── Estadísticas, rankings y notificaciones in-app
├── Superusuario (plataforma)
└── Portal público de competición
    ├── Portada
    ├── Información y reglamento
    ├── Equipos y plantillas públicas
    ├── Calendario / próximos enfrentamientos
    ├── Resultados
    ├── Tabla
    ├── Bracket
    ├── Rankings
    └── Perfiles públicos
```

### Landing

Debe demostrar en pocos scrolls: Futrob opera competiciones EA SPORTS FC Clubs, obtiene partidos desde EA, deja que los capitanes elijan cuáles cuentan y publica resultados confiables.

#### Header

- Logo Futrob.
- Anclas: Producto, Cómo funciona, Ejemplo público.
- Acciones: Iniciar sesión, Crear competición.

#### Hero

- Marca Futrob como señal dominante.
- Una promesa: operación completa de ligas/copas Clubs con datos EA.
- Una frase de apoyo sobre selección auditable de partidos oficiales.
- CTA primaria: crear competición; secundaria: ver competición pública.
- Visual dominante del producto (Match Center / candidatos), no collage de cards.

#### Secciones siguientes (una job por sección)

1. Flujo EA → candidatos → selección → confirmación.
2. Reprogramación controlada.
3. Rankings y portal para espectadores.
4. CTA final.

### Shell autenticado

#### Layout

La app autenticada (fuera de onboarding) usa un marco único:

```text
sidebar izquierda | command bar + contenido con scroll + action bar opcional
```

Regiones de la sidebar (scroll independiente del contenido central):

1. **Header sticky:** fila de cuenta (avatar + nombre abreviado + colapsar) y selector de contexto.
2. **Content (scroll):** tareas del espacio activo (placeholder hasta que existan colas de dominio).
3. **Footer sticky:** navegación General (Inicio, Competiciones, …).

Desktop admite colapso a **icon rail** (focus mode); el control de colapso vive en el header de la sidebar. La web responsive usa Sheet con las mismas regiones.

La app nativa usa Expo Router con tabs para los destinos frecuentes y Stack/overlays nativos para detalle y operaciones. **Más** agrupa destinos secundarios. El selector de contexto permanece siempre accesible desde el header; cambiar de tab no cambia por sí solo el espacio, club, organización o competición activos.

El command bar muestra la identidad del jugador (identificador de juego y club seleccionado) y acciones contextuales (solo controles operativos; una función pendiente se omite o se explica deshabilitada). La action bar inferior solo aparece cuando una página registra acciones.

#### Selector de contexto (único)

Un control en el header de la sidebar agrupa:

- **Espacio personal**
- **Competiciones** (accesibles al actor)
- **Clubes EA** (asociaciones del PlayerProfile + Añadir club). Elegir un club deja el espacio personal activo y fija el `ExternalClub` de contexto: Mis partidos consulta solo ese club.
- **Organización** (memberships + Crear organización)

Solo un ítem está activo. El club elegido es el ítem activo del espacio personal. El valor inicial sigue el `ONBOARDING_PATH` completado:

- `player` → Espacio personal
- `organization` → organización creada
- `invitation` → competición de la invitación

Visitas posteriores pueden recordar la última selección en el cliente. La URL y el selector se mantienen alineados.

#### Onboarding autenticado

Después del registro, el usuario pasa directamente por onboarding: al ser una cuenta nueva no se
consulta estado previo ni membresías. Después del login, la plataforma consulta primero
`actor_onboarding`; si está incompleto vuelve al onboarding y, solo si está completo, consulta
membresías para resolver el destino. En onboarding puede:

- crear una organización y una primera competición en borrador;
- aceptar una invitación a una competición y navegar directamente a ella;
- continuar como jugador hacia `/player` sin organización.

Los tres caminos aseguran un perfil personal de jugador. El identificador de EA es opcional y se
configura en el paso **Cuenta** o posteriormente desde Datos de juego. Los recorridos son:

- Organizador: Intención → Organización → Competición → Cuenta → Confirmar.
- Invitación: Intención → Invitación → Cuenta → Confirmar.
- Jugador: Intención → Cuenta → Club → Confirmar.

El paso **Club** permite asociar un `ExternalClub` al `PlayerProfile`. Más asociaciones se
añaden después desde el selector de contexto. Es opcional y no crea un
Team de competición, una inscripción ni una membresía de plantilla. `/onboarding/club` es la ruta
canónica. `/onboarding/team` solo redirige para recuperar sesiones o marcadores anteriores.

La competición inicial solicita identidad, edición, plataforma, región, timezone y formato, nace
como `draft` con reglas seguras y continúa en su pantalla de configuración. No se publican equipos,
stages ni fixture durante onboarding.

La tercera opción completa y persiste el onboarding personal; no requiere invitación y deja
disponibles las otras dos opciones para más adelante. El estado se consulta en cada entrada a
`/player`: un actor incompleto vuelve a `/onboarding`, mientras que un actor completo y sin
membresías usa `/player` como destino posterior al acceso.

#### Espacio personal del jugador

Es el destino posterior al onboarding cuando el usuario elige continuar como jugador. No requiere
crear una organización ni aceptar una invitación.

**General (personal):** Inicio · Competiciones · Clubes EA · Invitaciones.

- **Inicio personal:** resumen de partidos recientes, estadísticas destacadas y estado de vinculación de la cuenta de juego.
- **Mis partidos:** una lista de `ProviderMatch` del `ExternalClub` seleccionado en el selector de contexto (requiere `PlayerExternalClubAssociation`; si hay varios, el primero hasta que el jugador elija otro). Recientes = últimos 7 días de calendario; Todos = el conjunto que trae el proveedor. Recientes y Todos marcan el tipo de partido (liga, playoff, amistoso) y las tarjetas de la aparición cuando el jugador alineó con ese club. Si no alineó con ese club (identificador en el rival o ausente del partido), la fila permanece con el badge «No jugaste» y sin estadísticas personales; el marcador y el W/D/L siguen el club seleccionado. Un badge de hat-trick, póker o repóker aparece cuando la aparición del club seleccionado tiene 3, 4 o 5+ goles. El historial competitivo oficial se consulta mediante `GET /players/me/matches`; no confundirlo con el perfil EA de Mis estadísticas.
- **Detalle de partido personal:** `/player/matches/:providerKey/:externalMatchId` abre desde una fila de Mis partidos y conserva `view` y `sort` al volver. Busca solo en la misma ventana final de 50 `ProviderMatch`: no es un registro persistido ni un acceso directo del proveedor. Un breadcrumb (Mis partidos → clubes) sustituye el enlace de volver; debajo reutiliza la misma fila de marcador de Mis partidos, sin el enlace de abrir el partido ni la franja de aparición. La fila puede aparecer desde la caché de la lista, pero el detalle consulta su recurso para obtener las plantillas completas. Debajo, pestañas tipo pills cubren Resumen (comparación de equipos, rendimiento personal y destacados), Jugadores (plantillas) y Datos del partido. Presenta primero el club seleccionado y después el rival; dentro de cada plantilla ordena por rating descendente, deja ratings desconocidos al final y muestra todas las estadísticas persistidas sin convertir `null` en cero. Si el jugador participó, el resumen muestra su rendimiento; si no participó, la fila indica «No jugaste» y no se muestra un panel personal ficticio. Una identidad inválida o ausente usa un estado `not_found`; una ventana parcial incompleta conserva el error recuperable del proveedor.
- **Mis estadísticas:** perfil de rendimiento personal EA, según el patrón de pantalla de este documento; las proyecciones oficiales son una fuente separada.
- **Competiciones / Clubes EA:** listados; al abrir una entidad se activa el grupo Contexto.
- **Datos de juego:** vincular o actualizar identificador de jugador (subdestino desde Clubes EA o perfil).
- **Invitaciones:** aceptar una invitación o crear una organización como acciones secundarias.

La vista personal no muestra disputas, payloads EA crudos, tokens ni datos administrativos de organizaciones en las que el actor no sea miembro.

#### Navegación de organización (General)

- Inicio
- Competiciones
- Equipos
- Jugadores
- Invitaciones
- Organización (miembros, roles)
- Ajustes

#### Navegación dentro de competición (Contexto activo)

| Destino         | Propósito                                       |
| --------------- | ----------------------------------------------- |
| Resumen         | Estado operativo, pendientes, salud EA resumida |
| Calendario      | Enfrentamientos programados                     |
| Enfrentamientos | Detalle operativo del Encounter                 |
| Clasificación   | Tabla oficial                                   |
| Bracket         | Eliminación (si aplica)                         |
| Rankings        | Goleadores, asistencias, rating, rendimiento    |
| Equipos         | Inscripciones y plantillas                      |
| Disputas        | Desacuerdos y revisión                          |
| Analíticas      | Premium / operativa                             |
| Reglamento      | Reglamento y configuración                      |

Web responsive: Sheet con la misma sidebar. App nativa: tabs + Más/Stack con la misma arquitectura de destinos. Nada crítico queda solo en una sidebar oculta y el selector de contexto es accesible en ambas superficies.

#### Menú de cuenta

En la cabecera de la sidebar: Perfil · Enviar feedback · Contáctanos · Configuración · Cerrar sesión.

La navegación General vive en el footer sticky de la sidebar.

### Match Center (recurso central)

Ruta conceptual web: `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId`. Mobile conserva los mismos identificadores en una ruta Expo equivalente y en sus deep links; no inventa un recurso `Match` alternativo.

#### Cabecera

- Ambos Teams, jornada/ronda, horario (zona de competición), estado del Encounter.
- Acciones según permiso: reprogramar, proponer selección, confirmar, escalar, anular.

#### Tabs / secciones

1. **Overview** — resumen de serie (independiente o agregado) y próximos pasos.
2. **Official matches** — slots 1..N con horario propio y estado.
3. **EA candidates** — lista de partidos EA con stats y asignación a slots.
4. **Selection** — propuesta, preview, confirmaciones.
5. **Schedule** — historial de reprogramaciones.
6. **Stats** — estadísticas oficiales cuando existan.
7. **Dispute / History** — disputas y auditoría (permiso).

### Flujos críticos

#### Inscripción y club EA

Equipos → crear/editar Team → buscar club EA → seleccionar asociación operativa → gestionar inscripción. La selección no verifica cuenta ni propiedad.

#### Reprogramación

Encounter → solicitar cambio (encuentro o partido) → rival responde → aceptación actualiza horarios → notificaciones.

#### Oficialización

Sync EA → candidatos → capitán asigna → preview → rival confirma → aprobado → proyecciones.

#### Registro de jugador independiente

Registro → onboarding → continuar como jugador → vincular identificador de juego y club externo (ambos opcionales) → confirmar → crear o asegurar el perfil personal → espacio personal → consultar Recientes (si hay club asociado) y Oficiales/estadísticas cuando existan → aceptar invitación o crear organización más adelante.

#### Acceso de usuario existente

Login → consultar `actor_onboarding` → si está incompleto, onboarding → si está completo, consultar
membresías → resolver espacio personal, organización única o selector de organizaciones.

### Portal público

Sin sidebar administrativo. Header de competición + tabs horizontales sticky. Solo contenido publicado. Deep links a enfrentamientos muestran proyección pública, nunca candidatos internos ni acciones de capitán.

### Estados vacíos y permisos

- Ruta no aplicable al formato: omitir.
- Ruta aplicable sin datos: empty state con siguiente acción.
- Jugador sin club asociado en Mis partidos: empty state para asociar un club; el identificador de juego no alcanza.
- Jugador sin partidos recientes y con partidos más antiguos: empty de Recientes con acción hacia Todos.
- Jugador sin muestra en Mis estadísticas: empty state que explica la ausencia de apariciones para el contexto/periodo. En una vista de estadísticas oficiales, explicar que los datos aparecen tras aprobar resultados; no exigir invitación como condición universal.
- Sin permiso: 403 con salida segura; no disfrazar como vacío.

## Aceptación UX

Se conservan los IDs `UX-*` para trazabilidad. Son criterios de aceptación, no evidencia de pruebas realizadas.

### Alcance y coherencia

- **UX-SCP-001** Landing, web, app nativa y portal se identifican como Futrob y comparten tipografía, tokens y lenguaje visual; web y React Native mantienen render trees propios.
- **UX-SCP-002** La UI web y la app nativa React Native + Expo presentan ligas/copas EA SPORTS FC Clubs. No ofrecen fantasy, streaming propio, fútbol real ni OCR como camino feliz.
- **UX-SCP-003** La navegación base no cambia por formato; se ocultan destinos no aplicables (p. ej. bracket en liga pura).
- **UX-SCP-004** Toda UI de resultado distingue Enfrentamiento, Partido oficial, Partido EA y Serie (resolución).
- **UX-SCP-005** Candidatos EA y resultados oficiales tienen presentación visual distinta.

### Landing

- **UX-LND-001** Primer viewport: marca Futrob, una promesa, una frase de apoyo, CTA group y visual dominante del producto.
- **UX-LND-002** Explica el flujo EA → candidatos → selección → confirmación sin prometer automatización perfecta.
- **UX-LND-003** No hay métricas de clientes inventadas ni logos de sponsors.
- **UX-LND-004** En 360 px no hay scroll horizontal de página.
- **UX-LND-005** Todo CTA lleva a ruta o estado real.

### Shell y navegación

- **UX-NAV-001** La app muestra organización activa y, dentro de competición, la competición activa.
- **UX-NAV-002** Sidebar expandida/colapsada usable; iconos colapsados con nombre accesible.
- **UX-NAV-003** Web responsive usa Sheet; la app nativa usa tabs para destinos frecuentes + Más/Stack. Nada crítico queda solo en una sidebar oculta.
- **UX-NAV-004** Destino activo con `aria-current="page"` y no solo color.
- **UX-NAV-005** Volver desde detalle conserva filtros/scroll.
- **UX-NAV-006** URL directa de Encounter renderiza página completa.
- **UX-NAV-007** Sin permiso → 403 con salida segura.
- **UX-NAV-008** Un registro exitoso entra directamente al onboarding; un login exitoso comprueba primero onboarding y, solo si está completo, resuelve organizaciones.
- **UX-NAV-009** La navegación personal distingue Mis partidos, Mis estadísticas, Datos de juego e Invitaciones sin mostrar una organización ficticia.
- **UX-NAV-010** `/player` no renderiza el espacio personal hasta confirmar que el actor completó el onboarding; si está incompleto o la comprobación falla, vuelve de forma segura a `/onboarding`.
- **UX-NAV-011** Invitados y organizadores atraviesan Cuenta; omitir los datos EA conserva un perfil personal utilizable.
- **UX-NAV-012** El organizador termina en la configuración de su competición draft sin una consulta de destino adicional.
- **UX-NAV-013** La app nativa conserva el contexto activo —espacio personal, club EA, organización o competición— al navegar entre tabs y al reanudar desde background.
- **UX-NAV-014** Un deep link de invitación recibido sin sesión reanuda la aceptación después del login/signup y nunca pierde ni registra el token en telemetría.

### Wizard / creación de competición

- **UX-WIZ-001** Configuración reanudable en cinco pasos: información (identidad/edición/modalidad), formato, reglas (1–2 partidos, independiente/agregado), participantes y revisión; publicación valida participantes y estructura.
- **UX-WIZ-002** Borrador guardable/reanudable.
- **UX-WIZ-003** Cambiar formato o partidos-por-enfrentamiento pide confirmación antes de borrar datos incompatibles.
- **UX-WIZ-004** Errores junto al campo + resumen enlazable.
- **UX-WIZ-005** Publicar muestra revisión final de edición, modalidad, formato, reglas y timezone.
- **UX-WIZ-006** El onboarding del organizador crea un draft con nombre, edición, plataforma, región, timezone y formato, sin generar stages ni fixture.
- **UX-WIZ-007** El Stepper de cinco pasos no produce scroll horizontal y en móvil anuncia número, total y nombre del paso actual.

### Match Center

- **UX-MAT-001** Una fila permite identificar jornada/fecha, ambos equipos, marcador u horario, estado y acción.
- **UX-MAT-002** Mobile conserva identidad de ambos equipos; no colapsa a “A vs B” ambiguo.
- **UX-MAT-003** En series agregadas, el score primario y el agregado están etiquetados; no se confunden goles con “partido ganado”.
- **UX-MAT-004** Estados de selección/sync/disputa tienen texto e icono.
- **UX-MAT-005** Lista de candidatos muestra hora, resultado, duración, sides, jugadores clave y estado de uso.
- **UX-MAT-006** Asignar candidato a OfficialMatch 1/2 muestra preview antes de proponer.
- **UX-MAT-007** Confirmación rival, rechazo y contrapropuesta son acciones explícitas.
- **UX-MAT-008** Datos stale de sync muestran última actualización y acción de reintento segura.

### Reprogramación

- **UX-SCH-001** El usuario elige alcance: enfrentamiento completo o partido oficial concreto.
- **UX-SCH-002** Propuesta muestra horario anterior, nuevo, motivo y expiración.
- **UX-SCH-003** Historial de propuestas/contrapropuestas es legible y auditado en UI autorizada.
- **UX-SCH-004** Partidos aprobados no ofrecen CTA de reprogramación; el control aparece deshabilitado con razón.

### Standings, bracket y rankings

- **UX-STD-001** Tabla oficial legible en móvil con columnas prioritarias.
- **UX-BRK-001** Bracket tiene vista visual y lista accesible equivalente.
- **UX-BRK-002** Byes no muestran marcadores ficticios.
- **UX-RNK-001** Rankings muestran criterio y elegibilidad.
- **UX-RNK-002** Ranking de rendimiento de equipos está separado visualmente de la tabla oficial.

### Portal público

- **UX-PUB-001** Sin acciones de capitán/organizador.
- **UX-PUB-002** Sin candidatos internos, payloads EA crudos ni disputas privadas.
- **UX-PUB-003** Branding de competición visible; navegación por tabs claras.

### Accesibilidad y i18n

- **UX-A11Y-001** Web ofrece teclado completo, foco visible y restauración en diálogos; mobile expone labels, roles, hints y orden de lectura correctos a VoiceOver/TalkBack.
- **UX-A11Y-002** Contraste AA; estado no solo por color; targets ≥ 44 px en web touch y ≥ 44 dp en la app nativa.
- **UX-A11Y-003** Web respeta `prefers-reduced-motion`; mobile respeta la preferencia equivalente del sistema.
- **UX-I18N-001** Flujos críticos web y mobile en `es` y `en`.
- **UX-I18N-002** Horarios muestran zona de competición cuando el contexto de fixture lo requiere.

## Aplicación nativa (`apps/mobile`)

**Base técnica:** React Native + Expo (SDK 57), Expo Router, `react-native-svg`.

La marca y el lenguaje visual son los mismos que en web; cambia la plataforma de render.

### Unidades

| Web                  | Móvil       | Regla                                                                                |
| -------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `rem` (1rem = 16 px) | `dp` / `pt` | Conversión fija `1rem = 16`. Los tokens no se redefinen.                             |
| px CSS               | dp/pt       | Igual equivalencia.                                                                  |
| OKLCH (`oklch()`)    | sRGB hex    | RN no interpreta `oklch()`; `@futrob/ui-tokens` resuelve a hex al construir el tema. |

### Medidas y densidad

- La altura universal de control se mantiene: **44dp** (`--control-height`).
- **`dense` no existe en móvil**: toda superficie es touch; nunca por debajo de 44dp.
- Rampa de esquinas idéntica (`corner-xs…full`) convertida a dp.
- Sin hover ni focus-visible análogo: estados `pressed`/`focused` nativos con los mismos
  tokens (`--primary-hover`, `--ring`, `--muted`).

### Tipografía

- Manrope (pesos 400/500/600/700) vía `@expo-google-fonts/manrope`.
- Mismos roles `typography.*`; tamaños convertidos rem→dp; `letterSpacing` derivado de
  `em × tamaño` del rol.
- `typography.label` usa tracking ligero (`0.04em`). Mayúsculas son opt-in (p. ej. kicker de landing), no el default.

### Color y tema

- Grafito + Lima en ambos modos, resuelto desde `GRAPHITE_LIME_THEME`; misma semántica web/nativa.

### Primitivas móviles

Viven en `apps/mobile/src/ui/` — espejo de contrato, no de implementación:

- `Text` (roles cerrados), `Button` (`primary | secondary | outline | ghost | destructive`),
  `Input` (label + error + hint), `EmptyState` (flat dashed), `Screen`, `Logo`.
- Variantes cerradas: prohibido inventar variantes o colores ad hoc, igual que en web.
- Elevación: solo overlays futuros usarían elevación nativa; nunca combinar borde y sombra.
- Iconos: catálogo RN pendiente (Phosphor tiene build para RN); MVP no usa iconografía decorativa.

### Marca de app

Iconos y splash se generan desde el logo canónico de `packages/ui` mediante
`npm run generate:assets -w @futrob/mobile` con colores de `@futrob/ui-tokens`.
Fondo de splash e icono usan `background` grafito. El generador consume tokens semánticos.

## Implementación web con StyleX

### Setup

| Piece        | Location                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Runtime      | `@stylexjs/stylex`                                                                               |
| Compiler     | `@stylexjs/unplugin` via `tools/stylex/vite-plugin.ts`                                           |
| Web Vite     | StyleX before React / Start in `apps/web/vite.config.ts`                                         |
| Storybook    | `.storybook/main.ts`                                                                             |
| Tokens       | `packages/ui/src/styles/tokens.stylex.ts`, `media.stylex.ts` (import those files, not a barrel)  |
| Roles        | `packages/ui/src/styles/typography.ts`, `elevation.ts`                                           |
| Apply helper | `packages/ui/src/styles/apply.ts` (`applyProps`, `applyStyles`)                                  |
| Document CSS | `packages/ui/src/styles.css` in `@layer reset`; StyleX lists that layer in `useCSSLayers.before` |

Dev first paint loads `/virtual:stylex.css` from the root document `<head>`. `virtual:stylex:runtime` stays on a client module for HMR only. Production CSS is appended to the existing `styles.css` asset. `tools/stylex/guard-unplugin-css.cjs` keeps Vite from crashing if LightningCSS sees a transient empty selector while `defineConsts` are still resolving ([StyleX #1497](https://github.com/facebook/stylex/issues/1497)).

### Practices

Reglas de authoring:

- Colocate `stylex.create` with the component. Do not rebuild a utility library.
- Import `colors` from `@futrob/ui/styles/tokens.stylex` and `media` from `@futrob/ui/styles/media.stylex` inside `stylex.create`. StyleX cannot follow `defineVars` / `defineConsts` through a re-export. The package barrel is for runtime helpers (`applyProps`, `typography`).
- Conditions require `default`. Last `applyProps` / `stylex.props` argument wins.
- Longhand or single-value shorthands only.
- `stylex.when.*` + markers replace `group` / `peer`. Remaining descendant rules live in `slots.css`.
- Elevation is `elevation.sm|md|lg`. Do not combine with border/ring.

### What is not StyleX

- Generated `tokens.css` (OKLCH + semantic theme).
- Reset and document defaults in `styles.css` (`@layer reset`).
- Hairline-ring shadows in `elevation.css`.
- React Native styles in `apps/mobile`.

### Folder per primitive

New primitives live in their own directory. Existing flat files migrate in later PRs.

```text
components/heading/
  heading.tsx
  heading.test.ts
  heading.styles.ts    # only if stylex.create would push the file past ~400 lines
  heading.stories.tsx
  index.ts
```

Do not name component styles `*.stylex.ts`. That suffix is reserved for `defineVars` / `defineConsts`.

Keep composition stories (`forms`, `overlays`, `navigation`, `app-shell`, `data-table`, `icons`, `typography`) under `src/stories/patterns/`. Public imports stay `@futrob/ui`. `#components/*` still resolves flat `*.tsx`; folder primitives are imported from the package barrel.

### Consumo de primitivas

La aplicación importa los estilos una sola vez:

```css
@import "@futrob/ui/styles.css";
```

Los estilos de producto se escriben con StyleX. Importa `colors` desde
`@futrob/ui/styles/tokens.stylex` y `media` desde `@futrob/ui/styles/media.stylex`
(el compilador no sigue reexportaciones). Ver la sección StyleX de este documento.

Los componentes se importan desde la API pública:

```tsx
import { applyProps, Button, Field, FieldError, FieldLabel, Form, Input, InputWithIcon, Logo, readFormString } from "@futrob/ui";
import { CheckCircleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

const logo = stylex.create({ mark: { height: "2rem", width: "auto" } });

<Logo {...applyProps(undefined, undefined, logo.mark)} title="Futrob" />
<Form validationMode="onBlur">
  <Field
    name="name"
    validate={(value) => readFormString(value).trim() ? null : "Este campo es obligatorio."}
  >
    <FieldLabel>Nombre de la competición</FieldLabel>
    <Input name="name" />
    <FieldError />
  </Field>
</Form>
<InputWithIcon
  startIcon={MagnifyingGlassIcon}
  endIcon={CheckCircleIcon}
  placeholder="Equipo, jornada o rival"
/>
<Button>Continuar</Button>
```

`Form` consolida validación, errores de servidor y foco del primer control inválido. Cada
`FieldError` debe vivir dentro de su `Field`; las validaciones personalizadas retornan `null`
cuando el valor es válido, siguiendo el contrato de Base UI. Usa `readFormString` para
estrechar el `unknown` de `Field.validate` a string.

Los iconos del producto usan **Phosphor** (`@phosphor-icons/react`) con peso `regular`. Importa
siempre el export con sufijo `Icon` (p. ej. `MagnifyingGlassIcon`). Tipa props de icono con
`Icon` reexportado desde `@futrob/ui`. El inventario vive en Storybook (`Primitives/Icons`).

Para composición polimórfica usa `render` de Base UI; evita envolver un link en un button:

```tsx
<Button render={<Link to="/competitions/new" />}>Crear competición</Button>
```

### Aplicación de densidad

El tamaño universal es el default. Usa `dense` solo en tablas, filtros y toolbars de escritorio
con alta frecuencia de uso. El shell autenticado de producto aplica `data-density="dense"` y
controles densos de forma contextual; onboarding y marketing se quedan en altura universal.

```tsx
<Input dense />
<Button dense variant="outline">Editar fila</Button>
<Table dense>{/* … */}</Table>
```

No reduzcas manualmente altura o padding. En mobile, la primitiva preserva el
objetivo táctil de 44 px.

### Stories de primitivas y producto

Configuración en el root: `.storybook/`.

```bash
npm run storybook           # http://localhost:6006
npm run storybook:build     # build estático
```

(`ui:storybook` / `ui:storybook:build` siguen como alias.)

Lee stories de:

- `packages/ui/src/**/*.stories.tsx` — primitivas y patrones del design system
- `apps/web/src/**/*.stories.tsx` — composiciones de producto (alias `@/` → `apps/web/src`)

El addon a11y está habilitado. Toda primitiva o cambio de variante debe actualizar una story con
sus estados relevantes. Las stories de `apps/web` que importen auth/router deben proveer mocks o
decorators; no asumas que el runtime de Workers está disponible.

### Añadir o actualizar una primitiva

shadcn es una fuente de comportamiento inicial, no el dueño del estilo final:

```bash
npx shadcn@latest add dialog -c packages/ui
```

Después:

1. Revisa el diff; no aceptes un overwrite automático de tokens o primitivas afinadas.
2. Reduce la API a variantes cerradas y restylea con StyleX + tokens Futrob. No dejes Tailwind/`cn()`/`cva`.
3. Coloca la primitiva nueva en `src/components/<name>/` (`<name>.tsx`, `<name>.test.ts`,
   `<name>.stories.tsx`, `index.ts`). Extrae `<name>.styles.ts` solo si `stylex.create`
   empujaría el archivo por encima de ~400 líneas. No uses el sufijo `*.stylex.ts` para
   estilos de componente.
4. Exporta desde `src/index.ts`.
5. Añade o actualiza stories.
6. Ejecuta `npm run typecheck`, `npm run check` y `npm run storybook:build`.

## Recursos de marca

### Logo

El componente público está en [`packages/ui/src/logo.tsx`](/packages/ui/src/logo.tsx):

```tsx
import { applyProps, Logo } from "@futrob/ui";
import * as stylex from "@stylexjs/stylex";

const logo = stylex.create({ mark: { height: "2rem", width: "auto" } });

<Logo {...applyProps(undefined, undefined, logo.mark)} title="Futrob" />
<Logo {...applyProps(undefined, undefined, logo.mark)} monochrome />
```

- Sin `title`, el SVG es decorativo. Úsalo así junto al wordmark visible “Futrob”.
- Con `title`, el mark se anuncia como imagen accesible.
- `monochrome` usa `currentColor`; la variante normal usa `primary`.
- No deformar, rotar, añadir sombras ni cambiar la relación interna del mark.
- Espacio de seguridad mínimo: la mitad del ancho de la `F` alrededor del escudo.
- Tamaño mínimo recomendado: `20 px` en UI y `32 px` en impresión.

### Activos web

| Activo                                        | Uso                                     |
| --------------------------------------------- | --------------------------------------- |
| `/logo.svg`                                   | Marca vectorial independiente           |
| `/favicon.svg` y `/favicon.ico`               | Navegadores modernos y fallback         |
| `/icons/favicon-32.png`                       | Favicon raster                          |
| `/icons/apple-touch-icon.png`                 | Guardado en pantalla de inicio de Apple |
| `/icons/icon-192.png` y `/icons/icon-512.png` | Instalación web                         |
| `/icons/icon-maskable-512.png`                | Icono adaptativo Android                |
| `/safari-pinned-tab.svg`                      | Safari pinned tabs                      |
| `/og/futrob-default.png`                      | Open Graph y X/Twitter, `1200 × 630`    |
| `/site.webmanifest`                           | Nombre, tema e iconos instalables       |

La metadata global está conectada en
[`apps/web/src/routes/__root.tsx`](/apps/web/src/routes/__root.tsx). Cuando exista dominio de
producción, las rutas públicas deben emitir una URL absoluta para `og:image` y una URL canónica.
Las competiciones con branding propio podrán reemplazar la imagen OG por ruta sin alterar la
identidad global.

## Estado de ejecución y pendientes

La base implementada incluye tokens compartidos, Manrope, controles universales/dense,
formularios, navegación, tablas, estados vacíos, overlays Base UI y Storybook con addon a11y.
El shell y las tres pantallas personales tienen composiciones y stories en el código actual.
El reset de enlaces debe preservar los colores de variantes de botones y enlaces.

El inventario anterior de trabajo pendiente se conserva como alcance de revisión, no como
certificación de funcionalidad: listado/detalle de competiciones; auditoría de resultados con
tabla densa y diálogos; bracket responsive con lista equivalente; regresión visual representativa.
Verificar cobertura real en el código antes de declarar cualquiera de esos flujos completo.

Pendientes de diseño explícitos: reemplazar los KPI de Mis partidos por el patrón de Mis
estadísticas y diseñar un tema claro futuro. Ninguno forma parte de la migración de composición
actual. Las capturas del MVP anterior están obsoletas; regenerar referencias desde stories o
pantallas actuales, incluyendo escritorio y 360 px. Una captura histórica no manda sobre este contrato.

## Mantenimiento y comprobaciones

Este es el único documento de diseño. Mantener aquí nuevas decisiones de marca, UX,
arquitectura de información, primitivas y criterios de aceptación. `AGENTS.md`, reglas y skills
locales solo enlazan este contrato para diseño; las ADR conservan decisiones de arquitectura.
Las referencias ejecutables son `packages/ui/src/**/*.stories.tsx` y las stories de producto,
no otros manuales de diseño. No convertir planes pendientes en afirmaciones de implementación.

Para cambios de tokens/primitivas: generación y check de CSS, tests de tokens, `npm run check`,
`npm run test`, `npm run typecheck` y `npm run storybook:build`. Validar pantalla y estados
relevantes; revisar equivalencia visual light/dark, teclado, foco, reducido movimiento,
texto ES/EN, ausencia de overflow y contraste medido. Registrar limitaciones de verificación.

Enlaces de contexto: [PRD](/product/prd.md), [glosario](/product/domain-glossary.md),
[requisitos](/product/mvp-requirements.md), [criterios funcionales](/product/acceptance-criteria.md),
[arquitectura](/docs/architecture/overview.md). Estos documentos mantienen contratos de producto
y arquitectura, no una segunda especificación visual.
