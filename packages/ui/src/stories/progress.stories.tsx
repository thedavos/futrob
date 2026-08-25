import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "../components/progress";

const styles = stylex.create({
  playground: {
    width: "min(24rem, calc(100vw - 2rem))",
  },
  panel: {
    display: "grid",
    width: "min(24rem, calc(100vw - 2rem))",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  trackOnly: {
    width: "min(24rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  singleCol: {
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  hint: {
    marginTop: "0.75rem",
    color: colors.mutedForeground,
  },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/Progress",
  component: Progress,
  parameters: { layout: "centered" },
  args: {
    value: 42,
    className: playground.className,
    style: playground.style,
  },
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Progress {...args}>
      <ProgressLabel>Sincronización EA</ProgressLabel>
      <ProgressValue />
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </Progress>
  ),
};

export const States: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.panel)}>
      <Progress value={0}>
        <ProgressLabel>En cola</ProgressLabel>
        <ProgressValue />
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <Progress value={64}>
        <ProgressLabel>Sincronizando partidos</ProgressLabel>
        <ProgressValue />
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <Progress value={100}>
        <ProgressLabel>Completado</ProgressLabel>
        <ProgressValue />
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <Progress value={null}>
        <ProgressLabel>Indeterminado</ProgressLabel>
        <ProgressValue>{() => "En curso…"}</ProgressValue>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </div>
  ),
};

export const TrackOnly: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.trackOnly)}>
      <Progress value={35} {...applyProps(undefined, undefined, styles.singleCol)}>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <p {...applyProps(undefined, undefined, typography.caption, styles.hint)}>
        Barra compacta para toolbars y filas densas.
      </p>
    </div>
  ),
};
