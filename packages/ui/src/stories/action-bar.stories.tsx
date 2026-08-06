import type { Meta, StoryObj } from "@storybook/react-vite";

import { ActionBar, ActionBarEnd, ActionBarStart } from "../components/action-bar";
import { Button } from "../components/button";

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
        <span className="typo-caption text-muted-foreground">3 cambios pendientes</span>
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
