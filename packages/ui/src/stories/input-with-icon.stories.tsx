import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "../components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { InputWithIcon } from "../components/input-with-icon";

const meta = {
  title: "Primitives/InputWithIcon",
  component: InputWithIcon,
  parameters: {
    layout: "centered",
  },
  args: {
    dense: false,
    disabled: false,
    placeholder: "Equipo, jornada o rival",
    startIcon: MagnifyingGlassIcon,
    type: "search",
  },
  argTypes: {
    dense: { control: "boolean" },
    disabled: { control: "boolean" },
    endAction: { control: false },
    endIcon: { control: false },
    placeholder: { control: "text" },
    startIcon: { control: false },
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "number", "url", "tel"],
    },
  },
} satisfies Meta<typeof InputWithIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Field className="w-[min(24rem,calc(100vw-2rem))]" name="search">
      <FieldLabel>Buscar encuentro</FieldLabel>
      <InputWithIcon {...args} />
      <FieldDescription>Busca por equipo, jornada o rival.</FieldDescription>
    </Field>
  ),
};

export const AdornmentPositions: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-5">
      <Field name="start-icon">
        <FieldLabel>Icono inicial</FieldLabel>
        <InputWithIcon placeholder="Buscar equipo" startIcon={MagnifyingGlassIcon} type="search" />
      </Field>

      <Field name="end-icon">
        <FieldLabel>Icono final</FieldLabel>
        <InputWithIcon defaultValue="capitan@futrob.app" endIcon={CheckCircleIcon} type="email" />
        <FieldDescription>Los iconos decorativos no reciben el foco.</FieldDescription>
      </Field>

      <Field name="both-icons">
        <FieldLabel>Iconos a ambos lados</FieldLabel>
        <InputWithIcon
          defaultValue="capitan@futrob.app"
          endIcon={CheckCircleIcon}
          startIcon={EnvelopeSimpleIcon}
          type="email"
        />
      </Field>
    </div>
  ),
};

function PasswordWithVisibilityAction() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Field className="w-[min(24rem,calc(100vw-2rem))]" name="password">
      <FieldLabel>Contraseña</FieldLabel>
      <InputWithIcon
        autoComplete="new-password"
        endAction={
          <Button
            aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={isVisible}
            className="rounded-l-none text-muted-foreground hover:text-foreground"
            onClick={() => setIsVisible((visible) => !visible)}
            size="icon"
            static
            type="button"
            variant="ghost"
          >
            <span className="relative size-4" aria-hidden="true">
              <EyeIcon
                className={`absolute inset-0 size-4 transition-[opacity,filter,scale] duration-(--duration-slow) ease-(--ease-standard) ${
                  isVisible ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
                }`}
              />
              <EyeSlashIcon
                className={`absolute inset-0 size-4 transition-[opacity,filter,scale] duration-(--duration-slow) ease-(--ease-standard) ${
                  isVisible ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
                }`}
              />
            </span>
          </Button>
        }
        placeholder="Crea una contraseña"
        startIcon={LockIcon}
        type={isVisible ? "text" : "password"}
      />
      <FieldDescription>La acción final conserva un objetivo táctil de 44 px.</FieldDescription>
    </Field>
  );
}

export const InteractiveEndAction: Story = {
  render: () => <PasswordWithVisibilityAction />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const password = canvas.getByLabelText("Contraseña");
    const showPassword = canvas.getByRole("button", { name: "Mostrar contraseña" });

    await userEvent.type(password, "clave1234");
    await expect(password).toHaveAttribute("type", "password");

    await userEvent.click(showPassword);

    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("clave1234");
    await expect(canvas.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const DensityAndStates: Story = {
  render: () => (
    <div className="grid w-[min(24rem,calc(100vw-2rem))] gap-5">
      <Field name="universal">
        <FieldLabel>Universal · 44 px</FieldLabel>
        <InputWithIcon endIcon={CheckCircleIcon} startIcon={EnvelopeSimpleIcon} type="email" />
      </Field>

      <Field name="dense">
        <FieldLabel>Dense · 36 px en desktop</FieldLabel>
        <InputWithIcon
          dense
          endIcon={CheckCircleIcon}
          startIcon={EnvelopeSimpleIcon}
          type="email"
        />
      </Field>

      <Field disabled name="disabled">
        <FieldLabel>Deshabilitado</FieldLabel>
        <InputWithIcon
          defaultValue="FC Atlas Pro"
          disabled
          endIcon={CheckCircleIcon}
          startIcon={MagnifyingGlassIcon}
        />
      </Field>

      <Field invalid name="invalid">
        <FieldLabel>Correo electrónico</FieldLabel>
        <InputWithIcon
          aria-invalid="true"
          defaultValue="correo-invalido"
          startIcon={EnvelopeSimpleIcon}
          type="email"
        />
        <FieldError match>Ingresa un correo electrónico válido.</FieldError>
      </Field>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const errorText = canvas.getByText("Ingresa un correo electrónico válido.");
    const fieldError = errorText.closest('[data-slot="field-error"]');

    await expect(fieldError).not.toBeNull();
    await expect(fieldError).not.toHaveClass("font-medium");
    await expect(fieldError?.querySelector("svg")).not.toBeNull();
  },
};
