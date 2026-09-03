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
import { AcceptInvitationPage } from "./accept-invitation-page.tsx";
import { configureOrganizationsStory } from "./organizations-story-client.ts";

const styles = stylex.create({
  stub: {
    padding: "1.5rem",
    color: colors.mutedForeground,
  },
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const SCENARIO_IDS = ["success", "pending", "expired", "notFound", "rateLimited", "error"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

function InvitationStub({ label }: { readonly label: string }) {
  return <p {...applyProps(undefined, undefined, typography.body, styles.stub)}>{label}</p>;
}

function InvitationStoryShell({ scenario }: { readonly scenario: ScenarioId }) {
  const client = useMemo(() => {
    configureOrganizationsStory({ acceptInvitation: scenario });
    return new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
        mutations: { retry: false },
      },
    });
  }, [scenario]);

  const router = useMemo(() => {
    const rootRoute = createRootRoute({
      component: Outlet,
    });
    const acceptRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/invitations/accept",
      component: AcceptInvitationPage,
    });
    const competitionRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <InvitationStub label="Copa Story (stub de Storybook)" />,
    });
    const orgRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <InvitationStub label="Organización (stub de Storybook)" />,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([acceptRoute, competitionRoute, orgRoute]),
      history: createMemoryHistory({ initialEntries: ["/invitations/accept"] }),
    });
  }, [scenario]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

async function submitInvitationToken(
  canvas: ReturnType<typeof within>,
  token = "copa-invierno-token",
): Promise<void> {
  const input = await canvas.findByLabelText("Código de invitación");
  await userEvent.type(input, token);
  await userEvent.click(canvas.getByRole("button", { name: "Unirme a la competición" }));
}

const meta = {
  title: "Product/Player/Invitations",
  parameters: { layout: "fullscreen" },
  args: {
    scenario: "success",
  },
  argTypes: {
    scenario: {
      control: "select",
      options: [...SCENARIO_IDS],
    },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
};

export const Default: Story = {
  name: "Default",
  args: { scenario: "success" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Únete a una competición" }),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Código de invitación")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Unirme a la competición" })).toBeVisible();
  },
};

export const FieldValidation: Story = {
  name: "Field validation",
  args: { scenario: "success" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Unirme a la competición" }));
    await expect(canvas.getByText("Escribe el código de invitación.")).toBeVisible();
  },
};

export const Success: Story = {
  name: "Success",
  args: { scenario: "success" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(await canvas.findByText("Copa Story (stub de Storybook)")).toBeVisible();
  },
};

export const Expired: Story = {
  name: "Expired",
  args: { scenario: "expired" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(await canvas.findByText("La invitación ha caducado.")).toBeVisible();
    await expect(canvas.getByText("2170e2f6-a47e-4338-83c3-27c054630810")).toBeVisible();
    await expect(canvas.getByLabelText("Código de invitación")).toHaveValue("copa-invierno-token");
  },
};

export const NotFound: Story = {
  name: "Not found",
  args: { scenario: "notFound" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(await canvas.findByText("No encontramos esa invitación.")).toBeVisible();
  },
};

export const RateLimited: Story = {
  name: "Rate limited",
  args: { scenario: "rateLimited" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(
      await canvas.findByText("Alcanzaste el límite temporal de invitaciones."),
    ).toBeVisible();
    await expect(canvas.getByText(/Podrás reintentar en \d+ s\./)).toBeVisible();
    await waitFor(() => {
      expect(canvas.getByRole("button", { name: /Reintentar en \d+ s/ })).toBeDisabled();
    });
  },
};

export const Submitting: Story = {
  name: "Submitting",
  args: { scenario: "pending" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(await canvas.findByRole("button", { name: "Procesando…" })).toBeDisabled();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitInvitationToken(canvas);
    await expect(
      await canvas.findByText("No se pudo aceptar la invitación. Inténtalo de nuevo."),
    ).toBeVisible();
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: { scenario: "success" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => <InvitationStoryShell key={args.scenario} {...args} />,
};
