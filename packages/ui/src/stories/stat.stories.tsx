import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

import { Skeleton } from "../components/skeleton";
import { Stat, StatGroup, StatHint, StatLabel, StatValue } from "../components/stat";

const styles = stylex.create({
  compare: {
    display: "grid",
    width: "100%",
    maxWidth: "48rem",
    gap: "2rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.25rem",
  },
  panelLg: {
    display: "flex",
    width: "100%",
    maxWidth: "56rem",
    flexDirection: "column",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  panelMd: {
    display: "flex",
    width: "100%",
    maxWidth: "48rem",
    flexDirection: "column",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  panelMdStack: {
    display: "flex",
    width: "100%",
    maxWidth: "48rem",
    flexDirection: "column",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  panelPlain: {
    width: "100%",
    maxWidth: "48rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  strip: {
    display: "flex",
    width: "100%",
    maxWidth: "48rem",
    flexDirection: "column",
    gap: "2rem",
  },
  stripPanel: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  score: {
    display: "flex",
    width: "100%",
    maxWidth: "28rem",
    alignItems: "center",
    justifyContent: "center",
    gap: "2.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "2rem",
  },
  muted: { color: colors.mutedForeground },
  label: {
    marginBottom: "1rem",
    color: colors.mutedForeground,
  },
  hint: {
    marginTop: "1rem",
    color: colors.mutedForeground,
  },
  skeletonSm: { height: "2rem", width: "3rem" },
  skeletonXs: { height: "2rem", width: "2.5rem" },
  skeletonMd: { height: "2rem", width: "3.5rem" },
});

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
    <div {...applyProps(undefined, undefined, styles.compare)}>
      <div {...applyProps(undefined, undefined, styles.panel)}>
        <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>align</p>
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
      <div {...applyProps(undefined, undefined, styles.panel)}>
        <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>size</p>
        <StatGroup>
          <Stat>
            <StatLabel>default</StatLabel>
            <StatValue>9.2</StatValue>
          </Stat>
          <Stat>
            <StatLabel>compact</StatLabel>
            <StatValue size="compact">9.2</StatValue>
          </Stat>
          <Stat>
            <StatLabel>empty</StatLabel>
            <StatValue size="empty" tone="muted">
              Sin datos
            </StatValue>
          </Stat>
        </StatGroup>
      </div>
    </div>
  ),
};

export const NumericStates: Story = {
  name: "Numeric states",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.panelLg)}>
      <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
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

export const Tones: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.panelMd)}>
      <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
        El color refuerza el valor; el label y el hint siguen comunicando el significado.
      </p>
      <StatGroup>
        <Stat>
          <StatLabel>default</StatLabel>
          <StatValue size="compact" tone="default">
            12
          </StatValue>
          <StatHint>Goles</StatHint>
        </Stat>
        <Stat>
          <StatLabel>muted</StatLabel>
          <StatValue size="compact" tone="muted">
            —
          </StatValue>
          <StatHint>Sin datos</StatHint>
        </Stat>
        <Stat>
          <StatLabel>success</StatLabel>
          <StatValue size="compact" tone="success">
            +4
          </StatValue>
          <StatHint>Diferencia positiva</StatHint>
        </Stat>
        <Stat>
          <StatLabel>warning</StatLabel>
          <StatValue size="compact" tone="warning">
            3
          </StatValue>
          <StatHint>Partidos pendientes</StatHint>
        </Stat>
        <Stat>
          <StatLabel>error</StatLabel>
          <StatValue size="compact" tone="error">
            −2
          </StatValue>
          <StatHint>Racha negativa</StatHint>
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const EmptyAndUnavailable: Story = {
  name: "Empty and unavailable",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.panelMdStack)}>
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
          <StatValue size="empty" tone="muted">
            Sin datos
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
    <div {...applyProps(undefined, undefined, styles.panelPlain)}>
      <StatGroup aria-busy="true" aria-label="Cargando estadísticas">
        <Stat>
          <StatLabel>Partidos</StatLabel>
          <Skeleton {...applyProps(undefined, undefined, styles.skeletonSm)} />
        </Stat>
        <Stat>
          <StatLabel>Goles</StatLabel>
          <Skeleton {...applyProps(undefined, undefined, styles.skeletonXs)} />
        </Stat>
        <Stat>
          <StatLabel>Asistencias</StatLabel>
          <Skeleton {...applyProps(undefined, undefined, styles.skeletonXs)} />
        </Stat>
        <Stat>
          <StatLabel>Rating</StatLabel>
          <Skeleton {...applyProps(undefined, undefined, styles.skeletonMd)} />
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const TripleLayout: Story = {
  name: "Triple layout",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.panel)}>
      <StatGroup layout="triple">
        <Stat>
          <StatLabel>Victorias</StatLabel>
          <StatValue size="compact">12</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Empates</StatLabel>
          <StatValue size="compact">4</StatValue>
        </Stat>
        <Stat>
          <StatLabel>Derrotas</StatLabel>
          <StatValue size="compact">3</StatValue>
        </Stat>
      </StatGroup>
    </div>
  ),
};

export const PlayerKpiStrip: Story = {
  name: "Player KPI strip",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.strip)}>
      <div {...applyProps(undefined, undefined, styles.stripPanel)}>
        <p {...applyProps(undefined, undefined, typography.label, styles.label)}>Con datos</p>
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
      <div {...applyProps(undefined, undefined, styles.stripPanel)}>
        <p {...applyProps(undefined, undefined, typography.label, styles.label)}>
          Sin datos oficiales
        </p>
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
        <p {...applyProps(undefined, undefined, typography.caption, styles.hint)}>
          Solo resultados oficiales aprobados. No incluye amistosos ni candidatos EA.
        </p>
      </div>
    </div>
  ),
};

export const HighlightedScore: Story = {
  name: "Highlighted score",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.score)}>
      <Stat align="center">
        <StatLabel>Local</StatLabel>
        <StatValue>2</StatValue>
        <StatHint>Night Owls</StatHint>
      </Stat>
      <span
        aria-hidden="true"
        {...applyProps(undefined, undefined, typography.caption, styles.muted)}
      >
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
