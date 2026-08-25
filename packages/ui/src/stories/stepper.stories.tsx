import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles } from "@futrob/ui";

import { Stepper } from "../components/stepper";

const steps = [
  { id: "intention", label: "Intención" },
  { id: "game", label: "Juego" },
  { id: "account", label: "Cuenta" },
  { id: "review", label: "Confirmar" },
] as const;

const styles = stylex.create({
  playground: {
    width: "min(46rem, calc(100vw - 2rem))",
  },
  stack: {
    display: "grid",
    width: "min(46rem, calc(100vw - 2rem))",
    gap: "3rem",
  },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/Stepper",
  component: Stepper,
  parameters: { layout: "centered" },
  args: {
    className: playground.className,
    style: playground.style,
    currentStepId: "game",
    steps,
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ProgressStates: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.stack)}>
      {steps.map((step) => (
        <Stepper currentStepId={step.id} key={step.id} steps={steps} />
      ))}
    </div>
  ),
};

export const BranchLengths: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.stack)}>
      <Stepper
        currentStepId="invitation"
        steps={[
          { id: "intention", label: "Intención" },
          { id: "invitation", label: "Invitación" },
          { id: "review", label: "Confirmar" },
        ]}
      />
      <Stepper currentStepId="account" steps={steps} />
    </div>
  ),
};

export const Mobile: Story = {
  args: { currentStepId: "account" },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};

export const EnglishMobile: Story = {
  args: {
    currentStepId: "account",
    mobileSummary: (current, total, label) => `Step ${current} of ${total} · ${label}`,
    steps: [
      { id: "intention", label: "Start" },
      { id: "game", label: "Game" },
      { id: "account", label: "Account" },
      { id: "review", label: "Confirm" },
    ],
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
