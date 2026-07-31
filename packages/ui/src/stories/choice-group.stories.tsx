import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Gamepad2, Trophy, UserRound } from "lucide-react";

import { ChoiceGroup, ChoiceGroupIndicator, ChoiceGroupItem } from "../components/choice-group";

const meta = {
  title: "Primitives/ChoiceGroup",
  component: ChoiceGroup,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "Elige una intención",
    className: "w-[min(48rem,calc(100vw-2rem))] grid-cols-1 sm:grid-cols-3",
    defaultValue: "organization",
  },
} satisfies Meta<typeof ChoiceGroup<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <ChoiceGroup {...args}>
      <ChoiceGroupItem value="organization">
        <ChoiceGroupIndicator />
        <Trophy className="size-7 text-primary" />
        <span className="font-semibold">Organizar</span>
      </ChoiceGroupItem>
      <ChoiceGroupItem value="player">
        <ChoiceGroupIndicator />
        <UserRound className="size-7 text-primary" />
        <span className="font-semibold">Jugar</span>
      </ChoiceGroupItem>
      <ChoiceGroupItem disabled value="unavailable">
        <ChoiceGroupIndicator />
        <Gamepad2 className="size-7" />
        <span className="font-semibold">Próximamente</span>
      </ChoiceGroupItem>
    </ChoiceGroup>
  ),
};

export const ClosedVariants: Story = {
  render: () => (
    <div className="grid w-[min(44rem,calc(100vw-2rem))] gap-8">
      <ChoiceGroup aria-label="Tarjetas" className="grid-cols-2" defaultValue="one">
        <ChoiceGroupItem value="one">
          <ChoiceGroupIndicator />
          <span className="font-semibold">Tarjeta seleccionada</span>
        </ChoiceGroupItem>
        <ChoiceGroupItem value="two">
          <ChoiceGroupIndicator />
          <span className="font-semibold">Otra tarjeta</span>
        </ChoiceGroupItem>
      </ChoiceGroup>
      <ChoiceGroup aria-label="Píldoras" className="grid-cols-3" defaultValue="fc26">
        {["fc25", "fc26", "otra"].map((value) => (
          <ChoiceGroupItem appearance="pill" key={value} value={value}>
            <ChoiceGroupIndicator className="static size-5" />
            {value === "otra" ? "Otra" : value.toUpperCase()}
          </ChoiceGroupItem>
        ))}
      </ChoiceGroup>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <ChoiceGroup
      aria-label="Estados"
      className="w-[min(44rem,calc(100vw-2rem))] grid-cols-3"
      defaultValue="selected"
    >
      <ChoiceGroupItem value="selected">
        <ChoiceGroupIndicator />
        Seleccionado
      </ChoiceGroupItem>
      <ChoiceGroupItem value="available">
        <ChoiceGroupIndicator />
        Disponible
      </ChoiceGroupItem>
      <ChoiceGroupItem disabled value="disabled">
        <ChoiceGroupIndicator />
        Deshabilitado
      </ChoiceGroupItem>
    </ChoiceGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const selected = canvas.getByRole("radio", { name: "Seleccionado" });
    const available = canvas.getByRole("radio", { name: "Disponible" });
    await expect(selected).toBeChecked();
    selected.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(available).toBeChecked();
  },
};
