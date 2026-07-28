# `@futrob/ui`

Sistema de diseño y primitivas accesibles de Futrob. El package no conoce competiciones, EA,
roles ni permisos; esas composiciones viven en `apps/web`.

La dirección canónica es **light-first**, flat/line y operativa. Verde expresa marca y acción
primaria; `approved` es una semántica separada para resultados oficialmente aprobados.

## Capas

| Archivo / carpeta  | Responsabilidad                                                                |
| ------------------ | ------------------------------------------------------------------------------ |
| `src/tokens.css`   | Paleta OKLCH, tema claro, dark opt-in, tipo, geometría, movimiento y elevación |
| `src/tailwind.css` | Mapeo semántico Tailwind y utilidades tipográficas                             |
| `src/styles.css`   | Manrope autohospedada, reset y defaults globales                               |
| `src/components/`  | Primitivas Futrob sobre Base UI                                                |
| `src/stories/`     | Contratos visuales, de estados y accesibilidad                                 |
| `.storybook/`      | Configuración React + Vite + Tailwind + addon a11y                             |

## Contratos

- Tema claro por defecto. Dark solo con `.dark` o `[data-theme="dark"]` explícito.
- Controles universales de 44 px.
- `dense` es la única compactación: 40 px en desktop y 44 px en touch.
- Variantes cerradas. No añadir `xs`/`sm`/`lg` ni colores ad hoc.
- `typo-label` es el estilo de labels; metadata es la excepción consciente.
- Flat/line en controles y contenido. Solo overlays usan sombras ambientales.
- `ButtonIcon` es exclusivo de CTA de marketing.

## Catálogo

Formularios:

- `Field`, `FieldLabel`, `FieldDescription`, `FieldError`
- `Input`, `Textarea`, `Select`, `Checkbox`
- `Alert`

Navegación:

- `Tabs`, `Breadcrumb`, `Sheet`

Datos:

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`
- `Badge`, `EmptyState`, `Skeleton`

Overlays:

- `Dialog`, `AlertDialog`, `Popover`, `Tooltip`, `Sheet`

Acciones y soporte:

- `Button`, `ButtonIcon`, `Separator`, `Logo`

## Uso

La aplicación importa los estilos una sola vez:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@import "@futrob/ui/styles.css";
@import "@futrob/ui/tailwind.css";

@source "../../../packages/ui/src";
```

Los componentes se importan desde la API pública:

```tsx
import { Button, Field, FieldLabel, Input, Logo } from "@futrob/ui";

<Logo className="h-8 w-auto" />
<Field>
  <FieldLabel>Nombre de la competición</FieldLabel>
  <Input name="name" required />
</Field>
<Button>Continuar</Button>
```

Para composición polimórfica usa `render` de Base UI; evita envolver un link en un button:

```tsx
<Button render={<Link to="/competitions/new" />}>Crear competición</Button>
```

## Densidad

El tamaño universal es el default. Usa `dense` solo en tablas, filtros y toolbars de escritorio
con alta frecuencia de uso.

```tsx
<Input dense />
<Button dense variant="outline">Editar fila</Button>
<Table dense>{/* … */}</Table>
```

No reduzcas manualmente altura o padding con `className`. En mobile, la primitiva preserva el
objetivo táctil de 44 px.

## Storybook

```bash
npm run ui:storybook        # http://localhost:6006
npm run ui:storybook:build  # build estático y verificación de integración
```

El addon a11y está habilitado. Toda primitiva o cambio de variante debe actualizar una story con
sus estados relevantes.

## Añadir o actualizar una primitiva

shadcn es una fuente de comportamiento inicial, no el dueño del estilo final:

```bash
npx shadcn@latest add dialog -c packages/ui
```

Después:

1. Revisa el diff; no aceptes un overwrite automático de tokens o primitivas afinadas.
2. Reduce la API a variantes cerradas y aplica los tokens Futrob.
3. Exporta desde `src/index.ts`.
4. Añade o actualiza stories.
5. Ejecuta `npm run typecheck`, `npm run check` y `npm run ui:storybook:build`.

Especificación canónica:
[`/product/design-system-spec.md`](/product/design-system-spec.md).
