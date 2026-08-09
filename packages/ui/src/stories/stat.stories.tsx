import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "../components/skeleton";
import { Stat, StatGroup, StatHint, StatLabel, StatValue } from "../components/stat";

const meta = {
  title: "Primitives/Stat",
  component: Stat,
  parameters: { layout: "padded" },
  args: {
    align: "start",
  },
  argTypes: {
    align: {
      control: "select",
      options: ["start", "center", "end"],
    },
  },
} satisfies Meta<typeof Stat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Stat {...args}>
      <StatLabel>Goles</StatLabel>
      <StatValue>12</StatValue>
      <StatHint>Resultados oficiales aprobados</StatHint>
    </Stat>
  ),
};

export const ClosedVariants: Story = {
  name: "Align and size",
  render: () => (
    <div className="grid w-full max-w-3xl gap-8 sm:grid-cols-2">
      <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <p className="typo-caption text-muted-foreground">align</p>
        <StatGroup>
          <Stat align="start">
            <StatLabel>Inicio</StatLabel>
            <StatValue size="compact">8</StatValue>
          </Stat>
          <Stat align="center">
            <StatLabel>Centro</StatLabel>
            <StatValue size="compact">8</StatValue>
          </Stat>
          <Stat align="end">
            <StatLabel>Fin</StatLabel>
            <StatValue size="compact">8</StatValue>
          </Stat>
        </StatGroup>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
        <p className="typo-caption text-muted-foreground">size</p>
        <StatGroup>
          <Stat>
            <StatLabel>default</StatLabel>
            <StatValue>9.2</StatValue>
          </Stat>
          <Stat>
            <StatLabel>compact</StatLabel>
            <StatValue size="compact">9.2</StatValue>
          </Stat>
        </StatGroup>
      </div>
    </div>
  ),
};

export const NumericStates: Story = {
  name: "Numeric states",
  render: () => (
    <div className="w-full max-w-4xl space-y-6 rounded-xl border border-border bg-surface p-6">
      <p className="typo-caption text-muted-foreground">
        El formateo (locale, %, decimales) ocurre fuera del primitivo; Stat solo presenta el valor.
      </p>
      <StatGroup>
        <Stat>
          <StatLabel>Cero</StatLabel>
          <StatValue size="compact">0</StatValue>
          <StatHint>Sin goles aún</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Entero</StatLabel>
          <StatValue size="compact">12</StatValue>
          <StatHint>Goles</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Decimal</StatLabel>
          <StatValue size="compact">8,4</StatValue>
          <StatHint>Rating medio</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Negativo</StatLabel>
          <StatValue size="compact">−3</StatValue>
          <StatHint>Diferencia de goles</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Porcentaje</StatLabel>
          <StatValue size="compact">67%</StatValue>
          <StatHint>Victorias</StatHint>
        </Stat>
        <Stat>
          <StatLabel>100%</StatLabel>
          <StatValue size="compact">100%</StatValue>
          <StatHint>Partidos jugados</StatHint>
        </Stat>
        <Stat>
          <StatLabel>0%</StatLabel>
          <StatValue size="compact">0%</StatValue>
          <StatHint>Empates</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Largo</StatLabel>
          <StatValue size="compact">1.234.567</StatValue>
          <StatHint>Vista truncada si no cabe</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Muy largo</StatLabel>
          <StatValue size="compact">99.999.999.999</StatValue>
          <StatHint>tabular-nums + truncate</StatHint>
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const EmptyAndUnavailable: Story = {
  name: "Empty and unavailable",
  render: () => (
    <div className="w-full max-w-3xl space-y-6 rounded-xl border border-border bg-surface p-6">
      <StatGroup>
        <Stat>
          <StatLabel>Partidos</StatLabel>
          <StatValue size="compact" tone="muted">
            —
          </StatValue>
          <StatHint>Sin resultados oficiales</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Goles</StatLabel>
          <StatValue size="compact" tone="muted">
            —
          </StatValue>
          <StatHint>Disponible tras el primer oficial</StatHint>
        </Stat>
        <Stat>
          <StatLabel>Asistencias</StatLabel>
          <StatValue size="compact" tone="muted">
            —
          </StatValue>
        </Stat>
        <Stat>
          <StatLabel>Rating</StatLabel>
          <StatValue size="compact" tone="muted">
            —
          </StatValue>
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-full max-w-3xl rounded-xl border border-border bg-surface p-6">
      <StatGroup aria-busy="true" aria-label="Cargando estadísticas">
        <Stat>
          <StatLabel>Partidos</StatLabel>
          <Skeleton className="h-8 w-12" />
        </Stat>
        <Stat>
          <StatLabel>Goles</StatLabel>
          <Skeleton className="h-8 w-10" />
        </Stat>
        <Stat>
          <StatLabel>Asistencias</StatLabel>
          <Skeleton className="h-8 w-10" />
        </Stat>
        <Stat>
          <StatLabel>Rating</StatLabel>
          <Skeleton className="h-8 w-14" />
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const PlayerKpiStrip: Story = {
  name: "Player KPI strip",
  render: () => (
    <div className="w-full max-w-3xl space-y-8">
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="typo-label mb-4 text-muted-foreground">Con datos</p>
        <StatGroup>
          <Stat>
            <StatLabel>PJ</StatLabel>
            <StatValue size="compact">18</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Goles</StatLabel>
            <StatValue size="compact">7</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Asist.</StatLabel>
            <StatValue size="compact">4</StatValue>
          </Stat>
          <Stat>
            <StatLabel>Rating</StatLabel>
            <StatValue size="compact">8,1</StatValue>
          </Stat>
        </StatGroup>
      </div>
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="typo-label mb-4 text-muted-foreground">Sin datos oficiales</p>
        <StatGroup>
          <Stat>
            <StatLabel>PJ</StatLabel>
            <StatValue size="compact" tone="muted">
              —
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Goles</StatLabel>
            <StatValue size="compact" tone="muted">
              —
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Asist.</StatLabel>
            <StatValue size="compact" tone="muted">
              —
            </StatValue>
          </Stat>
          <Stat>
            <StatLabel>Rating</StatLabel>
            <StatValue size="compact" tone="muted">
              —
            </StatValue>
          </Stat>
        </StatGroup>
        <p className="typo-caption mt-4 text-muted-foreground">
          Solo resultados oficiales aprobados. No incluye amistosos ni candidatos EA.
        </p>
      </div>
    </div>
  ),
};

export const HighlightedScore: Story = {
  name: "Highlighted score",
  render: () => (
    <div className="flex w-full max-w-md items-center justify-center gap-10 rounded-xl border border-border bg-surface p-8">
      <Stat align="center">
        <StatLabel>Local</StatLabel>
        <StatValue>2</StatValue>
        <StatHint>Night Owls</StatHint>
      </Stat>
      <span className="typo-caption text-muted-foreground" aria-hidden="true">
        —
      </span>
      <Stat align="center">
        <StatLabel>Visitante</StatLabel>
        <StatValue>1</StatValue>
        <StatHint>Iron Gate</StatHint>
      </Stat>
    </div>
  ),
};
