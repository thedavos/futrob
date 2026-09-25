import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@futrob/ui";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { EditGameAccountDialog } from "./edit-game-account-dialog.tsx";
import { configurePlayerStory, type PlayerStoryMutationState } from "./player-story-client.ts";
import { playerGameAccountFixture, readyPlayerProfileFixture } from "./player-story-fixtures.ts";

function EditIdentifierStoryShell({
  updateGameAccount = "success",
  updateGameAccountErrorCode,
  initiallyOpen = true,
}: {
  readonly updateGameAccount?: PlayerStoryMutationState;
  readonly updateGameAccountErrorCode?: string;
  readonly initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const client = useMemo(() => {
    configurePlayerStory({
      profile: readyPlayerProfileFixture(),
      updateGameAccount,
      updateGameAccountErrorCode,
    });
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }, [updateGameAccount, updateGameAccountErrorCode]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <Button onClick={() => setOpen(true)} type="button">
          Editar identificador
        </Button>
        <EditGameAccountDialog
          account={playerGameAccountFixture()}
          onOpenChange={setOpen}
          open={open}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Player/Edit identifier",
  component: EditIdentifierStoryShell,
  parameters: { layout: "padded" },
  args: {
    initiallyOpen: true,
  },
  argTypes: {
    initiallyOpen: { control: "boolean" },
  },
} satisfies Meta<typeof EditIdentifierStoryShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <EditIdentifierStoryShell key={String(args.initiallyOpen)} {...args} />,
};

export const Prefill: Story = {
  name: "Prefill",
  args: { initiallyOpen: true },
  render: (args) => <EditIdentifierStoryShell key="prefill" {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(body.getByRole("textbox", { name: "Identificador de EA" })).toHaveValue(
      "davos282",
    );
    await expect(body.getByRole("radio", { name: "PlayStation" })).toBeChecked();
    await expect(body.getByRole("radio", { name: "FC 26" })).toBeChecked();
    await expect(body.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  },
};

export const Validation: Story = {
  name: "Validation",
  args: { initiallyOpen: true },
  render: (args) => <EditIdentifierStoryShell key="validation" {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const identifier = await body.findByRole("textbox", { name: "Identificador de EA" });
    await userEvent.clear(identifier);
    await userEvent.click(body.getByRole("button", { name: "Guardar cambios" }));
    await expect(body.getByText("Escribe tu identificador de EA.")).toBeVisible();
    await expect(body.getByRole("dialog")).toBeVisible();
  },
};

export const Pending: Story = {
  name: "Pending",
  args: { initiallyOpen: true },
  render: () => <EditIdentifierStoryShell key="pending" updateGameAccount="pending" />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("button", { name: "Guardar cambios" }));
    await expect(body.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    await expect(body.getByRole("button", { name: "Guardar cambios" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  },
};

export const Conflict: Story = {
  name: "Conflict",
  args: { initiallyOpen: true },
  render: () => (
    <EditIdentifierStoryShell
      key="conflict"
      updateGameAccount="error"
      updateGameAccountErrorCode="teams.game_account_conflict"
    />
  ),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const identifier = await body.findByRole("textbox", { name: "Identificador de EA" });
    await userEvent.clear(identifier);
    await userEvent.type(identifier, "gamer23");
    await userEvent.click(body.getByRole("button", { name: "Guardar cambios" }));
    await expect(
      await body.findByText("Ya tienes una cuenta con ese identificador, plataforma y edición."),
    ).toBeVisible();
    await expect(body.getByRole("dialog")).toBeVisible();
  },
};
