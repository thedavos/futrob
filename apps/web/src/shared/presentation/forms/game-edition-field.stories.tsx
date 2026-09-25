import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { GameEditionField, type GameEditionFieldCopy } from "./game-edition-field.tsx";

const styles = stylex.create({
  frame: {
    width: "min(42rem, calc(100vw - 2rem))",
  },
});

const englishCopy: GameEditionFieldCopy = {
  legend: "Game edition",
  other: "Another edition",
  customName: "Edition name",
  customPlaceholder: "e.g. FC 24",
};

function StatefulGameEditionField({
  initialCustom = false,
  initialValue = "",
  invalid = false,
  disabled = false,
  errorMessage = null,
  copy,
}: {
  readonly initialCustom?: boolean;
  readonly initialValue?: string;
  readonly invalid?: boolean;
  readonly disabled?: boolean;
  readonly errorMessage?: string | null;
  readonly copy?: GameEditionFieldCopy;
}) {
  const legendId = useId();
  const customInputId = useId();
  const errorId = useId();
  const [value, setValue] = useState(initialValue);
  const [custom, setCustom] = useState(initialCustom);
  return (
    <GameEditionField
      copy={copy}
      custom={custom}
      customInputId={customInputId}
      disabled={disabled}
      errorId={errorId}
      errorMessage={errorMessage}
      invalid={invalid}
      legendId={legendId}
      onValueChange={(next) => {
        setValue(next.value);
        setCustom(next.custom);
      }}
      value={value}
    />
  );
}

const meta = {
  title: "Product/Shared/Game edition field",
  component: GameEditionField,
  parameters: { layout: "centered" },
  args: {
    legendId: "game-edition-legend",
    customInputId: "game-edition-custom",
    errorId: "game-edition-error",
    value: "",
    custom: false,
    invalid: false,
    errorMessage: null,
    disabled: false,
    onValueChange: () => undefined,
  },
  argTypes: {
    value: { control: "text" },
    custom: { control: "boolean" },
    invalid: { control: "boolean" },
    disabled: { control: "boolean" },
    errorMessage: { control: "text" },
    legendId: { table: { disable: true } },
    customInputId: { table: { disable: true } },
    errorId: { table: { disable: true } },
    onValueChange: { table: { disable: true } },
    customInputRef: { table: { disable: true } },
    copy: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GameEditionField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <StatefulGameEditionField
      disabled={args.disabled}
      errorMessage={args.errorMessage}
      initialCustom={args.custom}
      initialValue={args.value}
      invalid={args.invalid}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fc26 = await canvas.findByRole("radio", { name: "FC 26" });
    await userEvent.click(fc26);
    await expect(fc26).toBeChecked();
  },
};

export const Selected: Story = {
  render: () => <StatefulGameEditionField initialValue="FC 26" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "FC 26" })).toBeChecked();
    await expect(canvas.queryByRole("textbox", { name: "Nombre de la edición" })).toBeNull();
  },
};

export const Custom: Story = {
  render: () => <StatefulGameEditionField initialCustom initialValue="FC 24" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "Otra edición" })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "Nombre de la edición" })).toHaveValue(
      "FC 24",
    );
  },
};

export const Invalid: Story = {
  render: () => (
    <StatefulGameEditionField errorMessage="Selecciona o escribe la edición del juego." invalid />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("radiogroup", { name: "Edición del juego" });
    await expect(group).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByText("Selecciona o escribe la edición del juego.")).toBeVisible();
  },
};

export const Disabled: Story = {
  render: () => <StatefulGameEditionField disabled initialValue="FC 26" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("radio", { name: "FC 26" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(canvas.getByRole("radio", { name: "Otra edición" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};

export const EnglishCopy: Story = {
  name: "English copy",
  render: () => <StatefulGameEditionField copy={englishCopy} initialCustom initialValue="FC 24" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Game edition")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Another edition" })).toBeChecked();
    await expect(canvas.getByRole("textbox", { name: "Edition name" })).toHaveValue("FC 24");
  },
};
