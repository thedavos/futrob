# Futrob — Especificación del sistema de diseño

**Estado:** canónico para el MVP (producto 2026-07)  
**Alcance:** marketing, aplicación autenticada y portal público responsive  
**Base técnica:** Tailwind CSS 4, shadcn sobre Base UI, Phosphor Icons y Storybook  
**Móvil:** React Native + Expo (`apps/mobile`) — ver sección [8](#8-móvil-appsmobile)

## 1. Dirección de producto

Futrob es una herramienta operativa y deportiva para el gaming. Ayuda a organizadores y
staff a construir y gestionar torneos de EA SPORTS FC, y a capitanes y jugadores a consultar,
auditar y entender partidos, estadísticas y rendimiento.

La interfaz debe sentirse como una **mesa de operaciones de competición**: precisa, rápida y
confiable, sin perder el carácter deportivo. La idea de marca es “del partido EA al resultado
oficial”.

### Principios

1. **Light por defecto.** Marketing, producto y portal arrancan siempre en tema claro. Dark es
   una opción explícita futura, no una preferencia automática del sistema operativo.
2. **Flat/line.** La estructura se expresa con espacio, tipografía y bordes de 1 px. Las sombras
   ambientales usan `smooth-shadow-ring-*` (shadow-plugin) en overlays por defecto, y en
   variantes opt-in `elevated` de `Card`, `EmptyState` y `Alert` (vía `elevation`) para
   superficies aisladas sobre fondo plano.
3. **Filas antes que tarjetas.** Partidos, candidatos, plantillas, auditorías y rankings se
   modelan como filas o tablas. Cards solo para entidades autónomas.
4. **Estado explícito.** Texto + icono/forma; el color nunca comunica un estado por sí solo.
5. **Jerarquía operativa.** Una acción primaria por contexto; las acciones destructivas se
   separan y confirman.
6. **Un solo lenguaje.** Base UI aporta comportamiento accesible; los tokens y variantes
   cerradas de Futrob aportan identidad.

### Anti-patrones

- Dashboard de cards uniformes o cards anidadas.
- Gradientes decorativos, glassmorphism global y sombras en controles estáticos.
- Combinar `border-*` / `ring-*` con `shadow-*` en la misma superficie elevada (doble borde).
  Usar `smooth-shadow-ring-*` (overlays, `Card`/`EmptyState` elevated, `Alert elevation`) en su lugar.
- Tamaños o colores arbitrarios dentro de pantallas.
- Badges solo por color.
- Usar el verde de aprobación para selección, sincronización o estados provisionales.
- Tratar datos candidatos de EA como resultados oficiales.

## 2. Fundamentos

### Tema

`:root` es la fuente canónica del tema claro. La aplicación declara
`<html data-theme="light">`. El selector `.dark`/`[data-theme="dark"]` se conserva como
capacidad opt-in, pero ninguna UI debe activarlo mediante `prefers-color-scheme`.

### Color

- La paleta **Pitch Ops** vive en `packages/ui-tokens` como datos tipados compartidos por web y
  móvil; `packages/ui/src/tokens.css` es el artefacto generado que consume la web
  (`npm run generate:css -w @futrob/ui-tokens`). El test de paridad de `@futrob/ui-tokens`
  garantiza que ambos artefactos no divergen.
- La paleta **Pitch Ops** usa OKLCH.
- Verde es marca y acción primaria.
- `--approved` es una variante verde más profunda y separada de `--primary`; se usa únicamente
  cuando un resultado ya fue auditado/aprobado.
- Sync usa azul, selección/revisión usa ámbar, disputa/error usa rojo y cancelación usa neutral.
- `--emphasis` es violeta: acento categórico cuando marca, info, warning y danger ya están ocupados.
  No sustituye a `--approved` ni al verde de victoria.
- Los componentes consumen tokens semánticos (`--primary`, `--approved`, `--danger`,
  `--border`, etc.), nunca tonos crudos.
- Objetivo: WCAG 2.2 AA. El borde de un control debe mantener contraste no textual suficiente
  contra su superficie.

### Tipografía

Familia única autohospedada: **Manrope Variable**. Pesos canónicos: 400, 500, 600 y 700.

| Rol      | Clase           | Uso principal                                                  |
| -------- | --------------- | -------------------------------------------------------------- |
| Display  | `typo-display`  | Headlines de marketing                                         |
| Heading  | `typo-heading`  | Títulos de página y panel                                      |
| Subtitle | `typo-subtitle` | Frase de apoyo bajo un heading                                 |
| Body     | `typo-body`     | Párrafos y contenido de lectura                                |
| Label    | `typo-label`    | Labels de formulario, navegación, columnas y estados compactos |
| Caption  | `typo-caption`  | Hints, metadata, timestamps y texto secundario sentence-case   |
| Score    | `typo-score`    | Marcadores y valores deportivos con cifras tabular             |

`typo-label` es el contrato predeterminado para etiquetas de formulario y navegación.
`typo-caption` cubre metadata y ayudas; el color secundario se aplica con tokens
(`text-muted-foreground`), no con otro rol. Las utilidades viven en
`packages/ui/src/tailwind.css`; los valores viven en `packages/ui/src/tokens.css`.

### Geometría y densidad

- Altura universal de controles: `--control-height` = **44 px**.
- `dense` es la única reducción permitida: `--control-height-dense` = **36 px** en interfaces
  operativas de desktop.
- En pantallas touch, `dense` vuelve a **44 px**.
- No existen tamaños `xs`, `sm` o `lg` para controles. `size` solo expresa forma:
  `default` o `icon`.
- Esquinas, espacios, duraciones y capas provienen de tokens. No crear rampas paralelas.
- En móvil la unidad es **dp/pt** con equivalencia `1rem = 16`; ver sección [8](#8-móvil-appsmobile).

## 3. Contrato de primitivas

Las primitivas viven en `@futrob/ui`, no conocen competiciones, EA, roles ni permisos y exponen
variantes cerradas.

### Formularios

- `Form`
- `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldValidity`
- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
- `ChoiceGroup` para selección única con apariencias cerradas `tile` y `pill`
- `Alert`
  - `variant`: semántica (`default` | `info` | `success` | `warning` | `destructive`).
  - `elevation="flat"` (default) con borde; `elevation="elevated"` usa `smooth-shadow-ring-md`
    sin border (paneles de aviso aislados, no alerts inline en forms densos).

Cada campo debe tener nombre accesible, descripción/error asociado y estado inválido visible.
Los formularios muestran validación junto al campo y un resumen solo cuando aporta contexto.

### Navegación

- `Tabs` con variantes cerradas `line` (indicador lineal, default) y `pills` (segmento relleno)
- `Breadcrumb`
- `Sheet` para navegación móvil
- `Stepper` para progreso secuencial no interactivo
- `Collapsible` para secciones expandibles de detalle (Encounter, filtros, historial)

La navegación de producto usa `typo-label`. El estado activo no depende únicamente del color.

### Datos

- `Table` y primitivas de fila/celda
- `Badge` con variantes `approved` (solo resultados oficiales) y `emphasis` (acento categórico; no es un estado)
- `Card` para entidades o resúmenes autónomos
  - `variant="flat"` (default): borde estructural, sin elevación.
  - `variant="elevated"`: `smooth-shadow-ring-md`. Sin `border`/`ring` en el mismo elemento.
    Solo entidades autónomas sobre fondo plano. No usar en grids densas, forms ni cards anidadas.
- `EmptyState`
  - `variant="flat"` (default): borde dashed.
  - `variant="elevated"`: `smooth-shadow-ring-md` para paneles vacíos aislados.
- `Skeleton`
- `Stat` (KPI): `StatLabel` + `StatValue` + `StatHint` opcional; `StatGroup` para strips.
  - `StatValue` size: `default` (`typo-score`) | `compact` (strip denso).
  - `tone`: `default` | `muted` | `success` | `warning` | `error` (`error` → token danger).
    `muted` para valores no disponibles (`—`). El color no comunica solo; acompaña label/hint.
    El formateo (locale, `%`, miles) es de la presentación; el primitivo no conoce dominio.
- `ScrollArea` para listas densas y overflow controlado
- `Progress` para sync/jobs con estado explícito (texto + barra; `value={null}` = indeterminado)

`Table dense` es el patrón recomendado para auditoría y operación en desktop. Las cifras usan
`tabular-nums`. Toda tabla debe tener encabezados y una representación móvil legible.

### Overlays

- `Dialog` / `AlertDialog`: `smooth-shadow-ring-lg` (sin border en el popup).
- `Popover` / `SelectContent`: `smooth-shadow-ring-md`.
- `Sheet`: `smooth-shadow-ring-lg` (sin border perimetral; divisores internos sí).
- `Tooltip`: `smooth-shadow-sm` (sin ring; no lleva borde).

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

## 4. Composición

- `packages/ui`: tokens y primitivas agnósticas.
- `apps/web/src/modules/<context>/presentation`: componentes y flujos de negocio.
- Una pantalla puede decidir composición y contenido, pero no inventar nuevas variantes de
  primitivas mediante clases.
- El layout autenticado prioriza navegación contextual, header de página, filtros y contenido
  fluido. El portal público usa header de competición + tabs, sin sidebar administrativa.

## 5. Movimiento y accesibilidad

- Animar solo `opacity`, `translate`, `scale` y, cuando es imprescindible, tamaño del indicador.
- Respetar `prefers-reduced-motion`; los tokens de duración pasan a `0ms`.
- Focus visible en todos los controles.
- Objetivos táctiles de al menos 44 px.
- Estados live/sync no roban foco ni reordenan silenciosamente.
- Debe existir alternativa de lista accesible para brackets visuales.

## 6. Storybook y control de calidad

Storybook es la referencia ejecutable de las primitivas y contiene escenarios de botones,
formularios, navegación, data tables y overlays.

```bash
npm run storybook
npm run storybook:build
```

Una primitiva nueva o una variante modificada requiere:

1. Story de estado normal, disabled, invalid o empty cuando aplique.
2. Revisión del tema claro y del modo `dense`.
3. Panel a11y sin violaciones conocidas.
4. `npm run typecheck`, `npm run check` y build de Storybook.

## 7. Referencias

- Implementación: [`packages/ui/`](/packages/ui/)
- Tokens compartidos: [`packages/ui-tokens/`](/packages/ui-tokens/)
- Contratos operativos: [`packages/ui/README.md`](/packages/ui/README.md)
- Criterios UX: [`product/ux-acceptance.md`](/product/ux-acceptance.md)
- Lenguaje de marca: [`docs/brand/README.md`](/docs/brand/README.md)

## 8. Móvil (`apps/mobile`)

**Estado:** canónico desde 2026-08.  
**Base técnica:** React Native + Expo (SDK 54), Expo Router, `react-native-svg`.

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
- Mismos roles `typo-*`; tamaños convertidos rem→dp; `letterSpacing` derivado de
  `em × tamaño` del rol.
- `typo-label` conserva mayúsculas/tracking para labels y navegación.

### Color y tema

- Tema claro por defecto, igual semántica de tokens (`primary`, `approved`, `danger`,
  `status-*`). Dark sigue siendo opt-in explícito, nunca del sistema operativo.

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
Fondo de splash e icono usan `--background` (light).
