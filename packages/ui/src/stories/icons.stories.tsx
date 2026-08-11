import type { Meta, StoryObj } from "@storybook/react-vite";

import { FUTROB_ICON_CATALOG } from "../icons/catalog";

const meta = {
  title: "Primitives/Icons",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  name: "Catálogo",
  render: () => (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="typo-heading text-foreground">Iconos Phosphor</h1>
        <p className="typo-subtitle text-muted-foreground">
          Inventario de los iconos usados en `@futrob/ui` y en la presentación de `apps/web`. Peso
          canónico: <span className="typo-label text-foreground">regular</span>.
        </p>
      </header>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FUTROB_ICON_CATALOG.map(({ name, label, usage, Icon }) => (
          <li
            key={name}
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-muted text-foreground">
              <Icon aria-hidden="true" className="size-5" weight="regular" />
            </span>
            <span className="min-w-0 flex flex-col gap-1">
              <span className="typo-label text-foreground">{label}</span>
              <code className="typo-caption truncate text-muted-foreground">{name}</code>
              <span className="typo-caption text-muted-foreground">{usage}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  ),
};

export const Weights: Story = {
  name: "Pesos",
  render: () => {
    const sample = FUTROB_ICON_CATALOG.find((entry) => entry.name === "TrophyIcon")!;
    const weights = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <p className="typo-caption text-muted-foreground">
          Futrob usa <span className="typo-label text-foreground">regular</span> por defecto. Los
          demás pesos existen en Phosphor; no los mezcles en UI operativa sin decisión de diseño.
        </p>
        <div className="flex flex-wrap items-end gap-6">
          {weights.map((weight) => (
            <div key={weight} className="flex flex-col items-center gap-2">
              <sample.Icon aria-hidden="true" className="size-8 text-foreground" weight={weight} />
              <span className="typo-caption text-muted-foreground">{weight}</span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Sizes: Story = {
  name: "Tamaños",
  render: () => {
    const sample = FUTROB_ICON_CATALOG.find((entry) => entry.name === "GameControllerIcon")!;
    const sizes = [
      { className: "size-3.5", label: "14px · denso" },
      { className: "size-4", label: "16px · input / inline" },
      { className: "size-5", label: "20px · nav / fila" },
      { className: "size-6", label: "24px · énfasis" },
    ] as const;
    return (
      <div className="flex flex-wrap items-end gap-8 rounded-xl border border-border bg-surface p-6">
        {sizes.map((size) => (
          <div key={size.className} className="flex flex-col items-center gap-2">
            <sample.Icon aria-hidden="true" className={`${size.className} text-foreground`} />
            <span className="typo-caption text-muted-foreground">{size.label}</span>
          </div>
        ))}
      </div>
    );
  },
};
