import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "../components/progress";

const meta = {
  title: "Primitives/Progress",
  component: Progress,
  parameters: { layout: "centered" },
  args: {
    value: 42,
    className: "w-[min(24rem,calc(100vw-2rem))]",
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
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-6 rounded-xl border border-border bg-surface p-6">
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
    <div className="w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-6">
      <Progress value={35} className="grid-cols-1">
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      <p className="typo-caption mt-3 text-muted-foreground">
        Barra compacta para toolbars y filas densas.
      </p>
    </div>
  ),
};
