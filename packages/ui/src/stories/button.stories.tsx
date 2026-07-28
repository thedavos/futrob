import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUpRight, Plus, Search, Settings } from "lucide-react";

import { Button } from "../components/button.js";
import { ButtonIcon } from "../components/button-icon.js";

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
    <div className="flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-6">
      <Button>
        <Plus />
        Crear competición
      </Button>
      <Button variant="secondary">Guardar borrador</Button>
      <Button variant="outline">Exportar</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="destructive">Eliminar</Button>
      <Button variant="link">Ver reglamento</Button>
      <Button aria-label="Buscar" size="icon" variant="outline">
        <Search />
      </Button>
    </div>
  ),
};

export const UniversalAndDense: Story = {
  render: () => (
    <div className="grid gap-5 rounded-xl border border-border bg-surface p-6">
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Universal · 44 px</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Settings />
            Configurar torneo
          </Button>
          <Button aria-label="Configuración" size="icon" variant="outline">
            <Settings />
          </Button>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="typo-label text-muted-foreground">Dense · 40 px en desktop</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button dense variant="outline">
            Editar fila
          </Button>
          <Button aria-label="Editar configuración" dense size="icon" variant="ghost">
            <Settings />
          </Button>
        </div>
      </div>
    </div>
  ),
};

export const MarketingCta: Story = {
  render: () => (
    <div className="rounded-xl bg-neutral-950 p-8">
      <Button>
        Organiza tu torneo
        <ButtonIcon>
          <ArrowUpRight />
        </ButtonIcon>
      </Button>
    </div>
  ),
};
