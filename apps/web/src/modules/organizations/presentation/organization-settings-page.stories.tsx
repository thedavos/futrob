import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { OrganizationSettingsPage } from "./organization-settings-page.tsx";
import {
  configureOrganizationsStory,
  STORY_ORGANIZATION_PROFILE,
  type OrganizationsLogoStoryState,
  type OrganizationsProfileStoryState,
  type OrganizationsSlugStoryState,
} from "./organizations-story-client.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const ORG = "org-story";

type StoryArgs = {
  readonly locale: Locale;
  readonly canEdit: boolean;
  readonly profileLoad: "success" | "pending" | "error";
  readonly profileSave: OrganizationsProfileStoryState;
  readonly slugCheck: OrganizationsSlugStoryState;
  readonly logo: OrganizationsLogoStoryState;
  readonly storedLogo: boolean;
};

function SettingsStoryShell(args: StoryArgs) {
  const client = useMemo(() => {
    configureOrganizationsStory({
      profile: args.storedLogo
        ? {
            ...STORY_ORGANIZATION_PROFILE,
            logo: { kind: "upload", key: "organization-logos/org-story/crest-1.png" },
          }
        : STORY_ORGANIZATION_PROFILE,
      profileLoad: args.profileLoad,
      profileSave: args.profileSave,
      slugCheck: args.slugCheck,
      logo: args.logo,
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(
      queryKeys.authorization.effectiveAccess({ organizationId: ORG }, [
        ORGANIZATION_PERMISSION.update,
      ]),
      {
        actorId: "actor-story",
        scope: { organizationId: ORG },
        roles: [],
        permissions: [
          {
            permission: ORGANIZATION_PERMISSION.update,
            allowed: args.canEdit,
            decidedAt: "organization",
          },
        ],
      },
    );
    return queryClient;
  }, [
    args.canEdit,
    args.logo,
    args.profileLoad,
    args.profileSave,
    args.slugCheck,
    args.storedLogo,
  ]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={args.locale} persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <OrganizationSettingsPage organizationId={ORG} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Organizations/Settings",
  parameters: { layout: "fullscreen" },
  args: {
    locale: "es",
    canEdit: true,
    profileLoad: "success",
    profileSave: "success",
    slugCheck: "free",
    logo: "success",
    storedLogo: false,
  },
  argTypes: {
    locale: { control: "inline-radio", options: ["es", "en"] },
    canEdit: { control: "boolean" },
    profileLoad: { control: "select", options: ["success", "pending", "error"] },
    profileSave: {
      control: "select",
      options: ["success", "slugConflict", "pending", "error", "forbidden"],
    },
    slugCheck: { control: "select", options: ["free", "taken", "invalid", "failed"] },
    logo: { control: "select", options: ["success", "uploadFailed", "pending"] },
    storedLogo: { control: "boolean" },
  },
  render: (args) => <SettingsStoryShell key={JSON.stringify(args)} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

const CREST = new File(
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "crest.png",
  {
    type: "image/png",
  },
);

function fileInput(canvasElement: HTMLElement): HTMLInputElement {
  const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not rendered");
  return input;
}

export const Playground: Story = {};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Ajustes de la organización" }),
    ).toBeVisible();
    await expect(await canvas.findByLabelText("Slug")).toHaveValue("liga-story");
    await expect(canvas.getByLabelText("Nombre de la organización")).toHaveValue("Liga Story");
    await expect(canvas.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  },
};

export const English: Story = {
  args: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Organization settings" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save changes" })).toBeDisabled();
  },
};

export const Loading: Story = {
  args: { profileLoad: "pending" },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("Cargando perfil…")).toBeVisible();
  },
};

export const LoadFailed: Story = {
  args: { profileLoad: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("No pudimos cargar el perfil de la organización."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
  },
};

export const ReadOnly: Story = {
  args: { canEdit: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Solo quien organiza puede cambiar estos datos."),
    ).toBeVisible();
    await expect(await canvas.findByLabelText("Nombre de la organización")).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  },
};

export const SaveChanges: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText("Nombre de la organización");
    await userEvent.clear(name);
    await userEvent.type(name, "Liga del Norte");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Cambios guardados.")).toBeVisible();
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Guardar cambios" })).toBeDisabled(),
    );
  },
};

export const SlugTaken: Story = {
  args: { slugCheck: "taken" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slug = await canvas.findByLabelText("Slug");
    await userEvent.clear(slug);
    await userEvent.type(slug, "liga-sur");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Ese slug ya está en uso.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Usar «liga-sur-2»" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Cambios guardados.")).toBeVisible();
  },
};

export const SlugConflictOnSave: Story = {
  args: { profileSave: "slugConflict" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slug = await canvas.findByLabelText("Slug");
    await userEvent.clear(slug);
    await userEvent.type(slug, "liga-sur");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Ese slug ya está en uso.")).toBeVisible();
    await expect(canvas.queryByText("Cambios guardados.")).toBeNull();
  },
};

export const SaveFailed: Story = {
  args: { profileSave: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText("Nombre de la organización");
    await userEvent.type(name, " 2");
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(
      await canvas.findByText("No pudimos guardar los cambios. Inténtalo nuevamente."),
    ).toBeVisible();
  },
};

export const UploadLogo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Slug");
    await userEvent.upload(fileInput(canvasElement), CREST);
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Cambios guardados.")).toBeVisible();
  },
};

export const UploadLogoFailed: Story = {
  args: { logo: "uploadFailed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Slug");
    await userEvent.upload(fileInput(canvasElement), CREST);
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(
      await canvas.findByText(
        "Guardamos los cambios, pero no pudimos subir el escudo. Inténtalo nuevamente.",
      ),
    ).toBeVisible();
  },
};

export const RemoveLogo: Story = {
  args: { storedLogo: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Quitar escudo" }));
    await userEvent.click(canvas.getByRole("button", { name: "Guardar cambios" }));
    await expect(await canvas.findByText("Cambios guardados.")).toBeVisible();
    await waitFor(() => expect(canvas.queryByRole("button", { name: "Quitar escudo" })).toBeNull());
  },
};
