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
import { hangQuery, setProviderHealthStoryScenario } from "./provider-health-story-client.ts";

const SCENARIO_IDS = ["ready", "empty", "loading", "accessLoading", "error", "denied"] as const;

type ScenarioId = (typeof SCENARIO_IDS)[number];

type StoryArgs = {
  readonly scenario: ScenarioId;
};

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const phone360Viewport = {
  globals: { viewport: { value: "phone360", isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone360: { name: "Phone 360", styles: { width: "360px", height: "800px" } },
      },
    },
  },
};

function distinctRows(elements: readonly Element[]): number {
  return new Set(elements.map((element) => Math.round(element.getBoundingClientRect().top))).size;
}

function distinctColumns(elements: readonly Element[]): number {
  return new Set(elements.map((element) => Math.round(element.getBoundingClientRect().left))).size;
}

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

function ProviderHealthStory({ scenario }: StoryArgs) {
  const client = useMemo(() => {
    setProviderHealthStoryScenario(scenario);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const accessKey = queryKeys.authorization.effectiveAccess({}, [
      ORGANIZATION_PERMISSION.superusersManage,
    ]);
    if (scenario === "accessLoading") {
      void queryClient
        .fetchQuery({
          queryFn: ({ signal }) => hangQuery(signal),
          queryKey: accessKey,
        })
        .catch(() => undefined);
    } else {
      queryClient.setQueryData(accessKey, access(scenario !== "denied"));
    }
    return queryClient;
  }, [scenario]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame)}>
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
    await expect(canvas.getByRole("status")).toHaveTextContent("");
    await expect(canvasElement.querySelector("[aria-busy='true']")).toBeNull();
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
    const page = await canvas.findByRole("main");
    await expect(page).not.toHaveAttribute("aria-busy");
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Cargando la salud del proveedor…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    const busyBody = page.querySelector("[aria-busy='true']");
    await expect(busyBody).not.toBeNull();
    await expect(canvas.getByRole("heading", { name: "Llamadas al proveedor" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Caché" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Fallos recientes" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Ventana de observación" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Actualizar" })).toBeVisible();
    await expect(canvas.queryByText("Estado: Degradado")).toBeNull();
    await expect(canvas.queryByText("Circuito: Semiabierto")).toBeNull();
  },
};

export const LoadingNarrow: Story = {
  name: "Cargando · 360",
  args: { scenario: "loading" },
  ...phone360Viewport,
  render: (args) => <ProviderHealthStory key={`${args.scenario}-narrow`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(360);
    const page = await canvas.findByRole("main");
    await expect(page).not.toHaveAttribute("aria-busy");
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Cargando la salud del proveedor…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    const busyBody = page.querySelector("[aria-busy='true']");
    await expect(busyBody).not.toBeNull();
    await expect(canvas.getByRole("heading", { name: "Llamadas al proveedor" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Caché" })).toBeVisible();

    const badgeRow = busyBody?.firstElementChild;
    const badgeSkeletons = Array.from(badgeRow?.querySelectorAll("[data-slot='skeleton']") ?? []);
    await expect(badgeSkeletons).toHaveLength(2);
    await expect(distinctRows(badgeSkeletons)).toBe(1);

    const kpiGroup = busyBody?.querySelector("[data-slot='stat-group']");
    const kpiSkeletons = Array.from(kpiGroup?.querySelectorAll("[data-slot='skeleton']") ?? []);
    await expect(kpiSkeletons).toHaveLength(4);
    await expect(distinctColumns(kpiSkeletons)).toBe(2);
    await expect(distinctRows(kpiSkeletons)).toBe(2);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const AccessLoading: Story = {
  name: "Comprobando permisos",
  args: { scenario: "accessLoading" },
  render: (args) => <ProviderHealthStory key={args.scenario} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = await canvas.findByRole("main");
    await expect(page).not.toHaveAttribute("aria-busy");
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Comprobando permisos…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    await expect(page.querySelector("[aria-busy='true']")).not.toBeNull();
    await expect(canvas.getByRole("heading", { name: "Llamadas al proveedor" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Actualizar" })).toBeNull();
    await expect(canvas.queryByText("Estado: Degradado")).toBeNull();
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
  args: { scenario: "ready" },
  ...phone360Viewport,
  render: (args) => <ProviderHealthStory key={`${args.scenario}-narrow`} {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(360);
    await expect(
      await canvas.findByRole("heading", { name: "Salud del proveedor EA" }),
    ).toBeVisible();
    const statusBadge = canvas.getByText("Estado: Degradado");
    const circuitBadge = canvas.getByText("Circuito: Semiabierto");
    await expect(statusBadge).toBeVisible();
    await expect(circuitBadge).toBeVisible();
    await expect(distinctRows([statusBadge, circuitBadge])).toBe(1);

    const kpiGroup = canvasElement.querySelector("[data-slot='stat-group']");
    const kpiCards = Array.from(kpiGroup?.querySelectorAll("[data-slot='stat']") ?? []);
    await expect(kpiCards).toHaveLength(4);
    await expect(distinctColumns(kpiCards)).toBe(2);
    await expect(distinctRows(kpiCards)).toBe(2);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};
