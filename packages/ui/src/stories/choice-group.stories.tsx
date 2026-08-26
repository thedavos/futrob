import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { GameControllerIcon, TrophyIcon, UserIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyProps, applyStyles } from "@futrob/ui";
import { media } from "#styles/media.stylex";

import { ChoiceGroup, ChoiceGroupIndicator, ChoiceGroupItem } from "../components/choice-group";

const styles = stylex.create({
  playground: {
    width: "min(48rem, calc(100vw - 2rem))",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
  },
  stack: {
    display: "grid",
    width: "min(44rem, calc(100vw - 2rem))",
    gap: "2rem",
  },
  twoCols: {
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  threeCols: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  states: {
    width: "min(44rem, calc(100vw - 2rem))",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  },
  icon: {
    width: "1.75rem",
    height: "1.75rem",
  },
  semibold: { fontWeight: 600 },
  indicator: {
    position: "static",
    width: "1.25rem",
    height: "1.25rem",
  },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/ChoiceGroup",
  component: ChoiceGroup,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "Elige una intención",
    className: playground.className,
    style: playground.style,
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
        <TrophyIcon {...applyProps(undefined, undefined, styles.icon)} />
        <span {...applyProps(undefined, undefined, styles.semibold)}>Organizar</span>
      </ChoiceGroupItem>
      <ChoiceGroupItem value="player">
        <ChoiceGroupIndicator />
        <UserIcon {...applyProps(undefined, undefined, styles.icon)} />
        <span {...applyProps(undefined, undefined, styles.semibold)}>Jugar</span>
      </ChoiceGroupItem>
      <ChoiceGroupItem disabled value="unavailable">
        <ChoiceGroupIndicator />
        <GameControllerIcon {...applyProps(undefined, undefined, styles.icon)} />
        <span {...applyProps(undefined, undefined, styles.semibold)}>Próximamente</span>
      </ChoiceGroupItem>
    </ChoiceGroup>
  ),
};

export const ClosedVariants: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.stack)}>
      <ChoiceGroup
        aria-label="Tarjetas"
        defaultValue="one"
        {...applyProps(undefined, undefined, styles.twoCols)}
      >
        <ChoiceGroupItem value="one">
          <ChoiceGroupIndicator />
          <span {...applyProps(undefined, undefined, styles.semibold)}>Tarjeta seleccionada</span>
        </ChoiceGroupItem>
        <ChoiceGroupItem value="two">
          <ChoiceGroupIndicator />
          <span {...applyProps(undefined, undefined, styles.semibold)}>Otra tarjeta</span>
        </ChoiceGroupItem>
      </ChoiceGroup>
      <ChoiceGroup
        aria-label="Píldoras"
        defaultValue="fc26"
        {...applyProps(undefined, undefined, styles.threeCols)}
      >
        {["fc25", "fc26", "otra"].map((value) => (
          <ChoiceGroupItem appearance="pill" key={value} value={value}>
            <ChoiceGroupIndicator {...applyProps(undefined, undefined, styles.indicator)} />
            {value === "otra" ? "Otra" : value.toUpperCase()}
          </ChoiceGroupItem>
        ))}
      </ChoiceGroup>
      <ChoiceGroup
        aria-label="Píldoras compactas"
        defaultValue="xbox"
        {...applyProps(undefined, undefined, styles.threeCols)}
      >
        {["crossgen", "xbox", "switch"].map((value) => (
          <ChoiceGroupItem appearance="pill" dense key={value} value={value}>
            {value === "crossgen" ? "Cross-gen" : value === "xbox" ? "Xbox" : "Switch"}
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
      defaultValue="selected"
      {...applyProps(undefined, undefined, styles.states)}
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

export const HoverAndFocus: Story = {
  render: () => (
    <ChoiceGroup
      aria-label="Estados interactivos"
      defaultValue="selected"
      {...applyProps(undefined, undefined, styles.states)}
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
    const available = canvas.getByRole("radio", { name: "Disponible" });
    await userEvent.hover(available);
    available.focus();
    await expect(available).toHaveFocus();
    await expect(available).not.toBeChecked();
  },
};
