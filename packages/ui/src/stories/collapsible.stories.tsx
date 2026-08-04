import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/collapsible";

const meta = {
  title: "Primitives/Collapsible",
  component: Collapsible,
  parameters: { layout: "centered" },
  args: {
    defaultOpen: false,
    disabled: false,
  },
  argTypes: {
    defaultOpen: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Collapsible
      {...args}
      className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3"
    >
      <CollapsibleTrigger className="typo-label border-0 px-2 hover:bg-muted">
        Candidatos EA
        <ChevronRight
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-transform duration-(--duration-normal) group-data-panel-open/collapsible-trigger:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-2 px-2 py-3">
          <p className="typo-body text-foreground">Real Nova vs Atlético Sur · 2-1</p>
          <p className="typo-caption text-muted-foreground">
            Revisa sides, duración y jugadores clave antes de proponer.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const Sections: Story = {
  render: () => (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] gap-3">
      {(
        [
          ["Resumen", "Marcador, jornada y estado del enfrentamiento."],
          ["Partidos oficiales", "Slots 1 y 2 con resultado aprobado o pendiente."],
          ["Candidatos EA", "Observaciones del proveedor listas para selección."],
        ] as const
      ).map(([title, body]) => (
        <Collapsible key={title} className="rounded-xl border border-border bg-surface p-2">
          <CollapsibleTrigger className="typo-label border-0 px-2 hover:bg-muted">
            {title}
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform duration-(--duration-normal) group-data-panel-open/collapsible-trigger:rotate-90"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="typo-caption px-2 py-3 text-muted-foreground">{body}</p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Collapsible
      disabled
      className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3"
    >
      <CollapsibleTrigger className="typo-label border-0 px-2">
        Historial (sin permiso)
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="typo-caption px-2 py-3 text-muted-foreground">
          Solo el staff autorizado puede auditar este historial.
        </p>
      </CollapsibleContent>
    </Collapsible>
  ),
};
