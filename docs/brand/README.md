# Identidad de Futrob

## Dirección

La identidad usa **Pitch Ops**: verde deportivo sobre una base oscura, sobria y operativa. El
escudo comunica competición y confianza; la `F` en negativo comunica avance.

- Marca principal: `--brand-500` (`#22c55e` de referencia).
- Dark es la presentación principal.
- El verde señala acción primaria, aprobación o camino ganador; no se usa como decoración
  ambiental.
- Estados de sincronización, selección y disputa tienen tokens propios.

Los valores canónicos viven en
[`packages/ui/src/tokens.css`](/packages/ui/src/tokens.css). Los componentes consumen tokens
semánticos, nunca escalas crudas ni colores escritos directamente en JSX.

## Logo

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
- `monochrome` usa `currentColor`; la variante normal usa `--brand-500`.
- No deformar, rotar, añadir sombras ni cambiar la relación interna del mark.
- Espacio de seguridad mínimo: la mitad del ancho de la `F` alrededor del escudo.
- Tamaño mínimo recomendado: `20 px` en UI y `32 px` en impresión.

## Activos web

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
