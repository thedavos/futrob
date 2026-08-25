# `@futrob/ui`

Sistema de diseño y primitivas accesibles de Futrob. El package no conoce competiciones, EA,
roles ni permisos; esas composiciones viven en `apps/web`.

La dirección canónica es **light-first**, flat/line y operativa. Verde expresa marca y acción
primaria; `approved` es una semántica separada para resultados oficialmente aprobados.

## Capas

| Archivo / carpeta   | Responsabilidad                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tokens.css`    | Paleta OKLCH, tema claro, dark opt-in, tipo, geometría, movimiento. **Artefacto generado** desde [`@futrob/ui-tokens`](../ui-tokens/README.md) — no editar a mano |
| `src/styles/*.ts`   | Tokens StyleX (`colors`, `media`), `typography`, `elevation`, `applyProps`                                                                                        |
| `src/elevation.css` | Sombras elevadas + hairline ring (nunca con `border`/`ring` en el mismo elemento)                                                                                 |
| `src/slots.css`     | Selectores que StyleX no expresa en un solo elemento (densidad de tabla, SVG hijos, enter/exit)                                                                   |
| `src/styles.css`    | Manrope autohospedada, reset, defaults globales, importa tokens/elevation/slots                                                                                   |
| `src/components/`   | Primitivas Futrob sobre Base UI + StyleX                                                                                                                          |
| `src/stories/`      | Contratos visuales, de estados y accesibilidad                                                                                                                    |

## Contratos

- Tema claro por defecto. Dark solo con `.dark` o `[data-theme="dark"]` explícito.
- Controles universales de 44 px.
- `dense` es la única compactación: 36 px en desktop y 44 px en touch.
- Variantes cerradas. No añadir `xs`/`sm`/`lg` ni colores ad hoc.
- `typography.label` es el estilo de labels; `typography.caption` cubre metadata y hints; `typography.subtitle` apoya headings.
- Flat/line en controles y contenido. Overlays usan `elevation.sm|md|lg` por defecto.
  `Card` / `EmptyState` admiten `variant="elevated"`; `Alert` admite `elevation="elevated"`.
  No combinar `border`/`ring` con `shadow` en el mismo elemento.
- `ButtonIcon` es exclusivo de CTA de marketing.

## Catálogo

Formularios:

- `Form`
- `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldValidity`
- `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`
- `ChoiceGroup`, `ChoiceGroupItem`, `ChoiceGroupIndicator`
- `Alert`

Navegación:

- `Tabs` (`line` | `pills`), `Breadcrumb`, `Sheet`, `Stepper`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- `Sidebar` (+ header/content/footer/group/menu, collapse via `SidebarProvider`) y `DropdownMenu`
- `MasterDetail` (lista + detalle con scroll independiente; mobile muestra detalle a pantalla completa cuando hay `selectedId`)

Composición de shell:

- `PageHeader`, `PageHeaderEyebrow`, `PageHeaderTitle`, `PageHeaderDescription`, `PageHeaderActions`
- `ActionBar`, `ActionBarStart`, `ActionBarEnd` (barra sticky inferior de acciones de página)

Datos:

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Badge`, `Card`, `EmptyState`, `Skeleton`
- `Stat`, `StatLabel`, `StatValue`, `StatHint`, `StatGroup`
- `ScrollArea`, `ScrollAreaContent`, `ScrollBar`
- `Progress`, `ProgressLabel`, `ProgressTrack`, `ProgressIndicator`, `ProgressValue`

Overlays:

- `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `Sheet`

Acciones y soporte:

- `Button`, `ButtonIcon`, `Separator`, `Logo`
- `useCopyToClipboard` (hook: Clipboard API + feedback `isCopied`)
- Iconos: Phosphor (`FUTROB_ICON_CATALOG`, Storybook `Primitives/Icons`)

## Uso

La aplicación importa los estilos una sola vez:

```css
@import "@futrob/ui/styles.css";
```

Los estilos de producto se escriben con StyleX. Importa `colors` desde
`@futrob/ui/styles/tokens.stylex` y `media` desde `@futrob/ui/styles/media.stylex`
(el compilador no sigue reexportaciones). Guía:
[`/docs/architecture/stylex.md`](/docs/architecture/stylex.md).

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

## Densidad

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

## Storybook

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

## Añadir o actualizar una primitiva

shadcn es una fuente de comportamiento inicial, no el dueño del estilo final:

```bash
npx shadcn@latest add dialog -c packages/ui
```

Después:

1. Revisa el diff; no aceptes un overwrite automático de tokens o primitivas afinadas.
2. Reduce la API a variantes cerradas y restylea con StyleX + tokens Futrob. No dejes Tailwind/`cn()`/`cva`.
3. Exporta desde `src/index.ts`.
4. Añade o actualiza stories.
5. Ejecuta `npm run typecheck`, `npm run check` y `npm run storybook:build`.

Especificación canónica:
[`/product/design-system-spec.md`](/product/design-system-spec.md).
