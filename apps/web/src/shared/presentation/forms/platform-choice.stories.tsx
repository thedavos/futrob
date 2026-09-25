import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles, ChoiceGroup, typography } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import { PlatformChoice } from "./platform-choice.tsx";

const styles = stylex.create({
  frame: {
    width: "min(42rem, calc(100vw - 2rem))",
  },
  fieldset: {
    margin: 0,
    borderWidth: 0,
    padding: 0,
  },
  legend: {
    marginBottom: "0.75rem",
  },
  grid: {
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
      [media.lg]: "repeat(5, minmax(0, 1fr))",
    },
  },
});

const grid = applyStyles(styles.grid);

const PLATFORMS = [
  { label: "PlayStation", value: GAME_PLATFORM.PLAYSTATION },
  { label: "Xbox", value: GAME_PLATFORM.XBOX },
  { label: "PC", value: GAME_PLATFORM.PC },
  { label: "Nintendo Switch 1", value: GAME_PLATFORM.NINTENDO_SWITCH_1 },
  { label: "Nintendo Switch 2", value: GAME_PLATFORM.NINTENDO_SWITCH_2 },
] as const;

function PlatformChoiceGroup({
  legendId,
  value,
  onValueChange,
}: {
  readonly legendId: string;
  readonly value: GamePlatformDto | "";
  readonly onValueChange: (value: GamePlatformDto) => void;
}) {
  return (
    <fieldset {...applyProps(undefined, undefined, styles.fieldset)}>
      <legend id={legendId} {...applyProps(undefined, undefined, typography.label, styles.legend)}>
        Plataforma
      </legend>
      <ChoiceGroup<GamePlatformDto | "">
        aria-labelledby={legendId}
        className={grid.className}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
        style={grid.style}
        value={value}
      >
        {PLATFORMS.map((platform) => (
          <PlatformChoice key={platform.value} label={platform.label} value={platform.value} />
        ))}
      </ChoiceGroup>
    </fieldset>
  );
}

const meta = {
  title: "Product/Shared/Platform choice",
  component: PlatformChoice,
  parameters: { layout: "centered" },
  args: {
    label: "PlayStation",
    value: GAME_PLATFORM.PLAYSTATION,
  },
  argTypes: {
    label: { control: "text" },
    value: {
      control: "select",
      options: [...PLATFORMS.map((platform) => platform.value)],
    },
  },
  decorators: [
    (Story) => (
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlatformChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: function Render() {
    const [value, setValue] = useState<GamePlatformDto | "">("");
    return (
      <PlatformChoiceGroup
        legendId="platform-choice-playground"
        onValueChange={setValue}
        value={value}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const playstation = await canvas.findByRole("radio", { name: "PlayStation" });
    await userEvent.click(playstation);
    await expect(playstation).toBeChecked();
  },
};

export const Selected: Story = {
  render: function Render() {
    const [value, setValue] = useState<GamePlatformDto | "">(GAME_PLATFORM.PLAYSTATION);
    return (
      <PlatformChoiceGroup
        legendId="platform-choice-selected"
        onValueChange={setValue}
        value={value}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "PlayStation" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Xbox" })).not.toBeChecked();
    for (const platform of PLATFORMS) {
      await expect(
        canvasElement.querySelector(`[data-platform-logo="${platform.value}"]`),
      ).not.toBeNull();
    }
  },
};
