import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

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

/** Validación local: errores bajo cada campo, sin banner de formulario. */
export const SignupFieldValidation: Story = {
  name: "Signup / Field validation",
  render: () => <AuthRouterDecorator initialPath="/signup" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Crear cuenta" }));

    const requiredMessages = canvas.getAllByText("Este campo es obligatorio.");
    await expect(requiredMessages.length).toBeGreaterThanOrEqual(3);
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};

/** Error de servidor: banner de formulario (+ error de campo cuando aplica). */
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

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Ya existe una cuenta con este correo.");
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
