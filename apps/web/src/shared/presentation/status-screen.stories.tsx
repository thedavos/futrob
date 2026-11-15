import type { Meta, StoryObj } from "@storybook/react-vite";
import { FailedScreen, PendingScreen } from "./status-screen.tsx";

const meta = {
  title: "Product/Shared/Status screen",
  component: PendingScreen,
  args: {
    message: "Verificando tu acceso…",
    placement: "page",
  },
  argTypes: {
    placement: { control: "inline-radio", options: ["page", "overlay", "region"] },
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PendingScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Appears 400 ms after mounting; a faster check shows only the background. */
export const Pending: Story = {};

/** Inside the shell: no logo, the sidebar already carries the brand. */
export const PendingInRegion: Story = {
  args: { message: "Cargando tus datos…", placement: "region" },
};

export const Failed: Story = {
  render: () => (
    <FailedScreen
      description="Revisa tu conexión e inténtalo de nuevo."
      onRetry={() => undefined}
      retryLabel="Reintentar"
      title="No se pudo verificar tu acceso"
    />
  ),
};
