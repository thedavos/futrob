import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { TrophyIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";

import { Button } from "../components/button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
} from "../components/empty-state";
import { TextLink } from "../components/text-link";

const styles = stylex.create({
  canvas: {
    display: "flex",
    minHeight: "32rem",
    width: "100%",
    flexDirection: "column",
  },
  fillCanvas: {
    display: "flex",
    minHeight: "100vh",
    width: "100%",
    flexDirection: "column",
  },
});

const canvas = applyStyles(styles.canvas);
const fillCanvas = applyStyles(styles.fillCanvas);

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: {
    fill: true,
  },
  argTypes: {
    fill: { control: "boolean" },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

function EmptyComposition({
  action = true,
  footer = false,
  ...args
}: ComponentProps<typeof EmptyState> & { action?: boolean; footer?: boolean }) {
  return (
    <EmptyState {...args}>
      <EmptyStateIcon>
        <TrophyIcon />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>Tu club aún no participa en competiciones</EmptyStateTitle>
        <EmptyStateDescription>
          Explora ligas y copas abiertas o espera a que tu organizador te invite.
        </EmptyStateDescription>
      </EmptyStateCopy>
      {action ? (
        <EmptyStateActions>
          <Button>Explorar competiciones</Button>
        </EmptyStateActions>
      ) : null}
      {footer ? (
        <EmptyStateFooter>
          ¿Buscas otro club?{" "}
          <TextLink href="#game-accounts" text="caption">
            Cambiar club
          </TextLink>
        </EmptyStateFooter>
      ) : null}
    </EmptyState>
  );
}

export const Playground: Story = {
  render: (args) => (
    <div {...canvas}>
      <EmptyComposition {...args} />
    </div>
  ),
};

export const WithAction: Story = {
  render: (args) => (
    <div {...canvas}>
      <EmptyComposition {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    const cta = view.getByRole("button", { name: "Explorar competiciones" });
    await expect(cta).toBeEnabled();
    await userEvent.click(cta);
  },
};

export const WithoutAction: Story = {
  render: (args) => (
    <div {...canvas}>
      <EmptyComposition {...args} action={false} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(
      view.getByRole("heading", { name: "Tu club aún no participa en competiciones" }),
    ).toBeTruthy();
    await expect(view.queryByRole("button", { name: "Explorar competiciones" })).toBeNull();
  },
};

export const WithFooter: Story = {
  render: (args) => (
    <div {...canvas}>
      <EmptyComposition {...args} footer />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    const changeClub = view.getByRole("link", { name: "Cambiar club" });
    await expect(changeClub).toHaveAttribute("href", "#game-accounts");
  },
};

export const Fill: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div {...fillCanvas}>
      <EmptyComposition {...args} fill footer />
    </div>
  ),
};
