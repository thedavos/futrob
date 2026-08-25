import type { Meta, StoryObj } from "@storybook/react-vite";

import { Body } from "../body/body.tsx";
import { TextLink } from "./text-link.tsx";

const meta = {
  title: "Primitives/TextLink",
  component: TextLink,
  parameters: { layout: "padded" },
  args: {
    children: "Volver al espacio personal",
    href: "#espacio",
    text: "body",
  },
  argTypes: {
    text: { control: "select", options: ["body", "caption", "label"] },
  },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const InlineInBody: Story = {
  render: () => (
    <Body measure>
      Sincroniza los candidatos y{" "}
      <TextLink href="#seleccion">confirma la selección oficial</TextLink>. La tabla pública no
      cambia hasta que apruebas el resultado.
    </Body>
  ),
};

export const Roles: Story = {
  render: () => (
    <div>
      <p>
        <TextLink href="#cuerpo" text="body">
          Enlace de cuerpo
        </TextLink>
      </p>
      <p>
        <TextLink href="#caption" text="caption">
          Enlace de caption
        </TextLink>
      </p>
      <p>
        <TextLink href="#label" text="label">
          Enlace de label
        </TextLink>
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    href: "#espacio",
    "aria-disabled": true,
    children: "Sincronización no disponible",
  },
};
