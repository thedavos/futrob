# Futrob UI execution audit

**Status:** design-system foundation implemented
**Date:** 2026-07-27

## Current baseline

| Area                           | Status                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| Theme                          | Light default; dark remains explicit opt-in                            |
| Foundations                    | Pitch Ops OKLCH tokens, Manrope roles, semantic Tailwind mapping       |
| Sizing                         | Universal 44 px controls; `dense` 40 px desktop / 44 px touch          |
| Visual language                | Flat/line; ambient elevation limited to floating layers                |
| Forms                          | Field, Input, Textarea, Select, Checkbox, validation and Alert         |
| Navigation                     | Tabs, Breadcrumb and mobile Sheet                                      |
| Data                           | Semantic Table/rows, dense mode, Badge, EmptyState and Skeleton        |
| Overlays                       | Dialog, AlertDialog, Popover, Tooltip and Sheet on Base UI             |
| Component documentation        | Storybook with docs and a11y addon                                     |
| Product integration            | Home CTAs and EA club search consume `@futrob/ui` primitives           |
| Tailwind package source scan   | Corrected to scan `packages/ui/src`; no inline safelist                |
| Anchor/button color regression | Global anchor reset no longer overrides class-based component variants |

## Guardrails

- Canonical decisions live in
  [`/product/design-system-spec.md`](/product/design-system-spec.md).
- Primitive usage and contribution rules live in
  [`/packages/ui/README.md`](/packages/ui/README.md).
- Storybook is built with `npm run storybook:build`.
- New product screens should compose primitives in
  `apps/web/src/modules/<context>/presentation`; domain-specific components do not move into
  `packages/ui`.

## Next product-level work

The primitive foundation is ready. Remaining UI work is composition rather than new foundation:

1. Authenticated application shell and responsive navigation.
2. Competition list/detail screens using rows and tabs.
3. Result audit workflow using dense table + dialog/alert-dialog patterns.
4. Responsive bracket with an accessible list equivalent.
5. Full visual regression coverage once representative product screens exist.
