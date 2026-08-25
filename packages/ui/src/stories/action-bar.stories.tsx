import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { ActionBar, ActionBarEnd, ActionBarStart } from "../components/action-bar";
import { Button } from "../components/button";

const styles = stylex.create({
  muted: { color: colors.mutedForeground },
});

const meta = {
  title: "Components/ActionBar",
  component: ActionBar,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ActionBar>
      <ActionBarStart>
        <span {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
          3 cambios pendientes
        </span>
      </ActionBarStart>
      <ActionBarEnd>
        <Button dense variant="outline">
          Cancelar
        </Button>
        <Button dense>Guardar</Button>
      </ActionBarEnd>
    </ActionBar>
  ),
};
