import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpRightIcon, PlusIcon, MagnifyingGlassIcon, GearIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, colors, typography } from "@futrob/ui";

import { Button } from "../components/button";
import { ButtonIcon } from "../components/button-icon";

const styles = stylex.create({
  panel: {
    display: "flex",
    maxWidth: "42rem",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  stack: {
    display: "grid",
    gap: "1.25rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  group: {
    display: "grid",
    gap: "0.5rem",
  },
  muted: { color: colors.mutedForeground },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
  },
  marketing: {
    borderRadius: "var(--corner-xl)",
    backgroundColor: colors.neutral950,
    padding: "2rem",
  },
});

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: {
    children: "Crear competición",
    dense: false,
    size: "default",
    variant: "default",
  },
  argTypes: {
    dense: { control: "boolean" },
    size: {
      control: "select",
      options: ["default", "icon"],
    },
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "link"],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ClosedVariants: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <Button>
        <PlusIcon />
        Crear competición
      </Button>
      <Button variant="secondary">Guardar borrador</Button>
      <Button variant="outline">Exportar</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="destructive">Eliminar</Button>
      <Button variant="link">Ver reglamento</Button>
      <Button aria-label="Buscar" size="icon" variant="outline">
        <MagnifyingGlassIcon />
      </Button>
    </div>
  ),
};

export const UniversalAndDense: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.stack)}>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>Universal · 44 px</p>
        <div {...applyHost(undefined, undefined, styles.row)}>
          <Button>
            <GearIcon />
            Configurar torneo
          </Button>
          <Button aria-label="Configuración" size="icon" variant="outline">
            <GearIcon />
          </Button>
        </div>
      </div>
      <div {...applyHost(undefined, undefined, styles.group)}>
        <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Dense · 36 px en desktop
        </p>
        <div {...applyHost(undefined, undefined, styles.row)}>
          <Button dense variant="outline">
            Editar fila
          </Button>
          <Button aria-label="Editar configuración" dense size="icon" variant="ghost">
            <GearIcon />
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const MarketingCta: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.marketing)}>
      <Button>
        Organiza tu torneo
        <ButtonIcon>
          <ArrowUpRightIcon />
        </ButtonIcon>
      </Button>
    </div>
  ),
};
