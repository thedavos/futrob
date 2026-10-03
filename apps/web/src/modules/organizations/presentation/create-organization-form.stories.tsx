import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { NewOrganizationPage } from "./new-organization-page.tsx";
import {
  configureOrganizationsStory,
  type OrganizationsCreateStoryState,
  type OrganizationsLogoStoryState,
  type OrganizationsSlugStoryState,
} from "./organizations-story-client.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
  stub: {
    color: colors.mutedForeground,
  },
});

const SCENARIO_IDS = [
  "success",
  "nameTaken",
  "nameTakenOnCreate",
  "checkFailed",
  "pending",
  "error",
] as const satisfies readonly OrganizationsCreateStoryState[];

type StoryArgs = {
  readonly scenario: OrganizationsCreateStoryState;
  readonly locale: Locale;
  readonly slugCheck?: OrganizationsSlugStoryState;
  readonly logo?: OrganizationsLogoStoryState;
};

function CreateOrganizationStoryShell({ scenario, locale, slugCheck, logo }: StoryArgs) {
  const client = useMemo(() => {
    configureOrganizationsStory({
      createOrganization: scenario,
      slugCheck: slugCheck ?? "free",
      logo: logo ?? "success",
    });
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }, [scenario, slugCheck, logo]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const newRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/new",
      component: NewOrganizationPage,
    });
    const competitionsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions",
      component: () => (
        <p {...applyProps(undefined, undefined, typography.body, styles.stub)}>
          Competiciones de la organización (stub de Storybook)
        </p>
      ),
    });
    return createRouter({
      routeTree: rootRoute.addChildren([newRoute, competitionsRoute]),
      history: createMemoryHistory({ initialEntries: ["/orgs/new"] }),
    });
  }, [scenario]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

async function submitName(canvas: ReturnType<typeof within>, name = "Liga Norte") {
  const input = await canvas.findByLabelText("Nombre de la organización");
  await userEvent.type(input, name);
  await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
}

const meta = {
  title: "Product/Organizer/Organizations/Create",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "success",
    locale: "es",
  },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
    locale: { control: "inline-radio", options: ["es", "en"] },
    slugCheck: { control: "select", options: ["free", "taken", "invalid", "failed"] },
    logo: { control: "select", options: ["success", "uploadFailed", "pending"] },
  },
  render: (args) => (
    <CreateOrganizationStoryShell key={`${args.scenario}-${args.locale}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Nombre de la organización")).toBeVisible();
    await expect(
      canvas.getByText("Es el nombre público de tu organización. Debe ser único."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Crear organización" })).toBeVisible();
  },
};

export const English: Story = {
  args: { locale: "en" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Organization name")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Create organization" })).toBeVisible();
  },
};

export const RequiredName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Crear organización" }));
    await waitFor(() => {
      expect(canvas.getByText("Escribe el nombre de la organización.")).toBeVisible();
    });
  },
};

export const NameTaken: Story = {
  args: { scenario: "nameTaken" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(await canvas.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText("Nombre de la organización")).toHaveFocus());
  },
};

export const NameTakenOnCreate: Story = {
  args: { scenario: "nameTakenOnCreate" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(await canvas.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
  },
};

export const CheckFailed: Story = {
  args: { scenario: "checkFailed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(
      await canvas.findByText("No pudimos verificar el nombre. Inténtalo nuevamente."),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Nombre de la organización")).toHaveValue("Liga Norte");
  },
};

export const Submitting: Story = {
  args: { scenario: "pending" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(await canvas.findByRole("button", { name: "Creando…" })).toBeDisabled();
  },
};

export const ServerError: Story = {
  args: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(
      await canvas.findByText("No pudimos crear la organización. Inténtalo nuevamente."),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Nombre de la organización")).toHaveValue("Liga Norte");
  },
};

export const Success: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(
      await canvas.findByText("Competiciones de la organización (stub de Storybook)"),
    ).toBeVisible();
  },
};

const CREST = new File(
  [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  "crest.png",
  {
    type: "image/png",
  },
);

export const SlugProposedFromName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Nombre de la organización"), "Liga Ñandú");
    await expect(canvas.getByLabelText("Slug")).toHaveValue("liga-nandu");
  },
};

export const SlugTaken: Story = {
  args: { slugCheck: "taken" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitName(canvas);
    await expect(await canvas.findByText("Ese slug ya está en uso.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Usar «liga-norte-2»" }));
    await expect(canvas.getByLabelText("Slug")).toHaveValue("liga-norte-2");
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(
      await canvas.findByText("Competiciones de la organización (stub de Storybook)"),
    ).toBeVisible();
  },
};

export const SlugInvalid: Story = {
  args: { slugCheck: "invalid" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Slug"), "admin");
    await userEvent.tab();
    await expect(
      await canvas.findByText(
        "Usa de 3 a 48 caracteres: minúsculas, números y guiones, sin palabras reservadas.",
      ),
    ).toBeVisible();
  },
};

export const LogoPreview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByLabelText("Nombre de la organización");
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("file input not rendered");
    await userEvent.upload(input, CREST);
    await expect(await canvas.findByRole("button", { name: "Quitar escudo" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Cambiar escudo" })).toBeVisible();
  },
};

export const LogoUploaded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Nombre de la organización"), "Liga Norte");
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("file input not rendered");
    await userEvent.upload(input, CREST);
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(
      await canvas.findByText("Competiciones de la organización (stub de Storybook)"),
    ).toBeVisible();
  },
};

export const LogoUploadFailed: Story = {
  args: { logo: "uploadFailed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Nombre de la organización"), "Liga Norte");
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("file input not rendered");
    await userEvent.upload(input, CREST);
    await userEvent.click(canvas.getByRole("button", { name: "Crear organización" }));
    await expect(
      await canvas.findByText(
        "Creamos la organización, pero no pudimos subir el escudo. Puedes subirlo desde Ajustes.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar subida" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Continuar sin escudo" })).toBeVisible();
  },
};
