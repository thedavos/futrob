import type { Meta, StoryObj } from "@storybook/react-vite";
import { SupportErrorAlert } from "./support-error-alert.tsx";

const meta = {
  title: "Product/Shared/Support error alert",
  component: SupportErrorAlert,
  args: {
    error: {
      message: "No pudimos finalizar tu configuración. Inténtalo nuevamente.",
      requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-2xl p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SupportErrorAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSupportCode: Story = {};

export const LegacyWithoutSupportCode: Story = {
  args: {
    error: { message: "No pudimos finalizar tu configuración. Inténtalo nuevamente." },
  },
};

export const RateLimited: Story = {
  args: {
    error: {
      message: "Alcanzaste el límite temporal. Espera antes de intentarlo nuevamente.",
      requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
      retryAfterSeconds: 37,
    },
  },
};

export const LongMessage: Story = {
  name: "Long message",
  args: {
    error: {
      message:
        "No pudimos completar la operación de plantilla porque el Team ya no está activo en esta competición. Conservamos tu contexto para que puedas reintentar.",
      requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
    },
  },
};
