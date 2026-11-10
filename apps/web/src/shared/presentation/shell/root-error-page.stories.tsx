import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { RootErrorPage } from "./root-error-page.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";

const meta = {
  title: "Product/Shared/Route error",
  component: RootErrorPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RootErrorPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    error: new Error("loader crashed"),
    reset: () => undefined,
  },
  render: () => (
    <I18nProvider initialLocale="es">
      <RootErrorPage error={new Error("loader crashed")} reset={() => undefined} />
    </I18nProvider>
  ),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(view.getByRole("alert")).toBeTruthy();
    await expect(view.getByText("Algo no ha ido bien")).toBeTruthy();
    const retry = view.getByRole("button", { name: "Reintentar" });
    await expect(retry).toBeEnabled();
    await userEvent.click(retry);
  },
};
