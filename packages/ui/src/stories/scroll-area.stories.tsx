import type { Meta, StoryObj } from "@storybook/react-vite";

import { ScrollArea, ScrollAreaContent } from "../components/scroll-area";

const meta = {
  title: "Primitives/ScrollArea",
  component: ScrollArea,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const candidateRows = [
  "Jornada 4 · Real Nova vs Atlético Sur · 2-1",
  "Jornada 4 · Club Norte vs Unión Este · 0-0",
  "Jornada 5 · Atlético Sur vs Club Norte · 3-2",
  "Jornada 5 · Unión Este vs Real Nova · 1-1",
  "Jornada 6 · Real Nova vs Club Norte · 4-0",
  "Jornada 6 · Atlético Sur vs Unión Este · 2-2",
  "Jornada 7 · Club Norte vs Unión Este · 1-0",
  "Jornada 7 · Real Nova vs Atlético Sur · 2-3",
];

export const Playground: Story = {
  render: () => (
    <ScrollArea className="h-56 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface">
      <ScrollAreaContent className="grid gap-3 p-4">
        {candidateRows.map((row) => (
          <p key={row} className="typo-body text-foreground">
            {row}
          </p>
        ))}
      </ScrollAreaContent>
    </ScrollArea>
  ),
};

export const VerticalList: Story = {
  render: () => (
    <div className="grid gap-2">
      <p className="typo-label text-muted-foreground">Candidatos EA</p>
      <ScrollArea className="h-64 w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface">
        <ScrollAreaContent className="divide-y divide-border">
          {candidateRows.map((row) => (
            <div key={row} className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="typo-body text-foreground">{row}</p>
              <span className="typo-caption text-muted-foreground">Sin usar</span>
            </div>
          ))}
        </ScrollAreaContent>
      </ScrollArea>
    </div>
  ),
};

export const HorizontalOverflow: Story = {
  render: () => (
    <ScrollArea className="w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface">
      <ScrollAreaContent className="flex w-max gap-3 p-4">
        {["Vista previa", "Selección", "Historial", "Estadísticas", "Auditoría", "Admin"].map(
          (tab) => (
            <span
              key={tab}
              className="typo-label inline-flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-foreground"
            >
              {tab}
            </span>
          ),
        )}
      </ScrollAreaContent>
    </ScrollArea>
  ),
};
