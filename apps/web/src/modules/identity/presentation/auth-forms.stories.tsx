import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { AuthRouterDecorator } from "./auth-story-router.tsx";

const meta = {
  title: "Product/Auth",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Login: Story = {
  render: () => <AuthRouterDecorator initialPath="/login" />,
};

export const Signup: Story = {
  render: () => <AuthRouterDecorator initialPath="/signup" />,
};

/** El usuario puede revelar y volver a ocultar la contraseña sin perder su valor. */
export const SignupPasswordVisibility: Story = {
  name: "Signup / Password visibility",
  render: () => <AuthRouterDecorator initialPath="/signup" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const password = canvas.getByLabelText("Contraseña");
    const showPassword = canvas.getByRole("button", { name: "Mostrar contraseña" });

    await userEvent.type(password, "clave1234");
    await expect(password).toHaveAttribute("type", "password");
    await expect(showPassword).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(showPassword);

    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("clave1234");
    const hidePassword = canvas.getByRole("button", { name: "Ocultar contraseña" });
    await expect(hidePassword).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(hidePassword);

    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("clave1234");
  },
};

/** Validación local: errores bajo cada campo, sin banner de formulario. */
export const SignupFieldValidation: Story = {
  name: "Signup / Field validation",
  render: () => <AuthRouterDecorator initialPath="/signup" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Crear cuenta" }));

    const requiredMessages = canvas.getAllByText("Este campo es obligatorio.");
    await expect(requiredMessages).toHaveLength(3);
    for (const message of requiredMessages) {
      const fieldError = message.closest('[data-slot="field-error"]');
      await expect(fieldError).not.toBeNull();
      await expect(fieldError).toHaveAttribute("data-slot", "field-error");
      await expect(fieldError?.querySelector("svg")).not.toBeNull();
    }
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

/** El hint cambia a error al salir del campo y se recupera mientras el usuario corrige. */
export const SignupPasswordValidationMessage: Story = {
  name: "Signup / Password validation on blur",
  render: () => <AuthRouterDecorator initialPath="/signup" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const password = canvas.getByLabelText("Contraseña");
    const passwordHint = "Mínimo 8 caracteres, incluyendo letras y números.";

    await userEvent.type(canvas.getByLabelText("Nombre completo"), "Ana Pérez");
    await userEvent.type(canvas.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await userEvent.type(password, "12345678");
    await userEvent.click(canvas.getByRole("button", { name: "Mostrar contraseña" }));

    await expect(canvas.getByText(passwordHint)).toBeVisible();
    await expect(canvas.queryByText("Incluye al menos una letra.")).not.toBeInTheDocument();

    await userEvent.click(canvas.getByLabelText("Correo electrónico"));

    const passwordError = await canvas.findByText("Incluye al menos una letra.");
    await waitFor(() => {
      expect(passwordError).toBeVisible();
    });
    await expect(canvas.queryByText(passwordHint)).not.toBeInTheDocument();
    await expect(password).toHaveAttribute(
      "aria-describedby",
      passwordError.closest('[data-slot="field-error"]')?.id,
    );
    await expect(password).toHaveAttribute("aria-invalid", "true");

    await userEvent.clear(password);
    await userEvent.type(password, "clave1234");

    await expect(canvas.getByText(passwordHint)).toBeVisible();
    await expect(canvas.queryByText("Incluye al menos una letra.")).not.toBeInTheDocument();
    await expect(password).not.toHaveAttribute("aria-invalid");
  },
};

/** Error de servidor asociado a un campo: inline y sin banner duplicado. */
export const SignupServerError: Story = {
  name: "Signup / Server error",
  render: () => <AuthRouterDecorator initialPath="/signup" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByLabelText("Nombre completo");
    const email = canvas.getByLabelText("Correo electrónico");
    const password = canvas.getByLabelText("Contraseña");

    await userEvent.clear(name);
    await userEvent.type(name, "Ana Pérez");
    await userEvent.clear(email);
    await userEvent.type(email, "ya-existe@ejemplo.com");
    await userEvent.clear(password);
    await userEvent.type(password, "clave1234");
    await userEvent.click(canvas.getByRole("button", { name: "Crear cuenta" }));

    await expect(await canvas.findByText("Ya existe una cuenta con este correo.")).toBeVisible();
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
    await expect(email).toHaveAttribute("aria-invalid", "true");
  },
};

/** Validación local en login: errores bajo campos, sin banner. */
export const LoginFieldValidation: Story = {
  name: "Login / Field validation",
  render: () => <AuthRouterDecorator initialPath="/login" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Iniciar sesión" }));

    const requiredMessages = canvas.getAllByText("Este campo es obligatorio.");
    await expect(requiredMessages.length).toBeGreaterThanOrEqual(2);
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

/** Login reutiliza el mismo patrón blur → corrección en vivo que signup. */
export const LoginEmailValidationOnBlur: Story = {
  name: "Login / Email validation on blur",
  render: () => <AuthRouterDecorator initialPath="/login" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByLabelText("Correo electrónico");

    await userEvent.type(email, "correo-invalido");
    await userEvent.click(canvas.getByLabelText("Contraseña"));

    const emailError = await canvas.findByText("Ingresa un correo electrónico válido.");
    const fieldError = emailError.closest('[data-slot="field-error"]');
    await expect(fieldError).not.toBeNull();
    await waitFor(() => {
      expect(fieldError).toBeVisible();
    });
    await expect(email).toHaveAttribute("aria-describedby", fieldError?.id);
    await expect(email).toHaveAttribute("aria-invalid", "true");

    await userEvent.clear(email);
    await userEvent.type(email, "ana@ejemplo.com");

    await waitFor(() => {
      expect(canvas.queryByText("Ingresa un correo electrónico válido.")).not.toBeInTheDocument();
    });
    await expect(email).not.toHaveAttribute("aria-invalid");
  },
};

/** Error de servidor en login: solo banner de formulario. */
export const LoginServerError: Story = {
  name: "Login / Server error",
  render: () => <AuthRouterDecorator initialPath="/login" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const email = canvas.getByLabelText("Correo electrónico");
    const password = canvas.getByLabelText("Contraseña");

    await userEvent.clear(email);
    await userEvent.type(email, "malo@ejemplo.com");
    await userEvent.clear(password);
    await userEvent.type(password, "clave1234");
    await userEvent.click(canvas.getByRole("button", { name: "Iniciar sesión" }));

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("El correo o la contraseña no son correctos.");
  },
};
