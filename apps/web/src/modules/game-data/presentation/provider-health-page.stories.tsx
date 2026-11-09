import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { ProviderHealthPage } from "./provider-health-page.tsx";
import { setProviderHealthStoryScenario } from "./provider-health-story-client.ts";

const SCENARIO_IDS = ["ready", "empty", "loading", "error", "denied"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
  readonly narrow?: boolean;
};

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 360,
    paddingInline: "1rem",
  },
});

function access(allowed: boolean) {
  return {
    actorId: "actor-story",
    scope: {},
    roles: [],
    permissions: [
      {
        permission: ORGANIZATION_PERMISSION.superusersManage,
        allowed,
        decidedAt: "platform" as const,
      },
    ],
  };
}

function ProviderHealthStory({ scenario, narrow = false }: StoryArgs) {
  const client = useMemo(() => {
    setProviderHealthStoryScenario(scenario);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(
      queryKeys.authorization.effectiveAccess({}, [ORGANIZATION_PERMISSION.superusersManage]),
      access(scenario !== "denied"),
    );
    return queryClient;
  }, [scenario]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
          <ProviderHealthPage />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Admin/Provider health",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready" },
  argTypes: {
    scenario: { control: "select", options: [...SCENARIO_IDS] },
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
};

export const Ready: Story = {
  args: { scenario: "ready" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Salud del proveedor EA" }),
    ).toBeVisible();
    await expect(canvas.getByText("Estado: Degradado")).toBeVisible();
    await expect(canvas.getByText("Circuito: Semiabierto")).toBeVisible();
    await expect(canvas.getByText(/80/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Actualizar" })).toBeVisible();
  },
};

export const Empty: Story = {
  args: { scenario: "empty" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Aún no hay actividad del proveedor")).toBeVisible();
  },
};

export const Loading: Story = {
  args: { scenario: "loading" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("status", { name: "Cargando la salud del proveedor…" }),
    ).toBeVisible();
  },
};

export const ErrorState: Story = {
  name: "Error",
  args: { scenario: "error" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("No pudimos cargar la salud del proveedor."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
  },
};

export const Denied: Story = {
  args: { scenario: "denied" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Salud del proveedor EA" }),
    ).toBeVisible();
    await expect(canvas.getByText("No tienes acceso a este panel")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Actualizar" })).toBeNull();
  },
};

export const Narrow: Story = {
  args: { scenario: "ready", narrow: true },
  render: (args) => <ProviderHealthStory key={`${args.scenario}-narrow`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Salud del proveedor EA" }),
    ).toBeVisible();
    await expect(canvas.getByText("Estado: Degradado")).toBeVisible();
  },
};
