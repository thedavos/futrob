import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { ActionBar, ActionBarEnd, ActionBarStart, applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  ShellActionBarProvider,
  useShellActionBar,
} from "@/shared/presentation/shell/shell-action-bar.tsx";
import { configureCompetitionsStory } from "./competitions-story-client.ts";
import { leagueDraft } from "./competition-rules-fixtures.ts";
import { CompetitionSetupPage, type CompetitionSetupStep } from "./competition-setup-page.tsx";

const ORG = "org-1";
const COMPETITION = "competition-1";

const SETUP_PERMISSIONS = [
  COMPETITION_PERMISSION.update,
  COMPETITION_PERMISSION.participantsManage,
  COMPETITION_PERMISSION.publish,
  COMPETITION_PERMISSION.invitationsManage,
] as const;

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 390,
    paddingInline: "1rem",
  },
});

const SCENARIO_IDS = ["ready", "loading", "error"] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];

function seedAccess(queryClient: QueryClient) {
  queryClient.setQueryData(
    queryKeys.authorization.effectiveAccess({ organizationId: ORG, competitionId: COMPETITION }, [
      ...SETUP_PERMISSIONS,
    ]),
    {
      actorId: "actor-story",
      scope: { organizationId: ORG, competitionId: COMPETITION },
      roles: [],
      permissions: SETUP_PERMISSIONS.map((permission) => ({
        permission,
        allowed: true,
        decidedAt: "organization",
      })),
    },
  );
}

function SetupStoryShell({
  narrow = false,
  scenario,
}: {
  readonly narrow?: boolean;
  readonly scenario: ScenarioId;
}) {
  const client = useMemo(() => {
    configureCompetitionsStory({
      competitionDraft:
        scenario === "loading" ? "pending" : scenario === "error" ? "error" : leagueDraft,
      organizationTeams: { teams: [] },
      organizationParticipants: { [COMPETITION]: { participants: [] } },
    });
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    seedAccess(queryClient);
    return queryClient;
  }, [scenario]);

  return (
    <I18nProvider initialLocale="es">
      <QueryClientProvider client={client}>
        <ShellActionBarProvider>
          <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
            <SetupBody />
            <StoryActionBar />
          </div>
        </ShellActionBarProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
}

function SetupBody() {
  const [step, setStep] = useState<CompetitionSetupStep>("information");
  return (
    <CompetitionSetupPage
      competitionId={COMPETITION}
      currentStep={step}
      onStepChange={setStep}
      organizationId={ORG}
    />
  );
}

function StoryActionBar() {
  const { actions } = useShellActionBar();
  if (actions.length === 0) return null;
  const start = actions.filter((action) => action.placement === "start");
  const end = actions.filter((action) => action.placement === "end");
  return (
    <ActionBar>
      {start.length > 0 ? (
        <ActionBarStart>
          {start.map((action) => (
            <Fragment key={action.id}>{action.node}</Fragment>
          ))}
        </ActionBarStart>
      ) : null}
      {end.length > 0 ? (
        <ActionBarEnd>
          {end.map((action) => (
            <Fragment key={action.id}>{action.node}</Fragment>
          ))}
        </ActionBarEnd>
      ) : null}
    </ActionBar>
  );
}

const meta = {
  title: "Product/Organizer/Competition setup/Page",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", narrow: false },
  argTypes: {
    scenario: { control: "select", options: SCENARIO_IDS },
    narrow: { control: "boolean" },
  },
  render: (args) => <SetupStoryShell key={`${args.scenario}-${String(args.narrow)}`} {...args} />,
} satisfies Meta<{
  readonly scenario: ScenarioId;
  readonly narrow?: boolean;
}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Ready: Story = {
  name: "Con datos",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByRole("heading", { name: "Configurar competición" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByText("Borrador")).resolves.toBeVisible();
    await expect(
      canvas.findByRole("navigation", { name: "Configuración de competición" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByLabelText("Nombre de la competición")).resolves.toBeVisible();
    await expect(
      canvas.findByRole("heading", { name: "Información general" }),
    ).resolves.toBeVisible();
    await expect(canvas.findByRole("heading", { name: "Identidad visual" })).resolves.toBeVisible();
    await expect(canvas.findByRole("button", { name: "Guardar borrador" })).resolves.toBeVisible();
    await expect(canvas.findByRole("button", { name: "Continuar" })).resolves.toBeVisible();
    await expect(canvas.queryByRole("status", { name: "Cargando competición…" })).toBeNull();
  },
};

export const Loading: Story = {
  name: "Cargando",
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByRole("status", { name: "Cargando competición…" });
    const main = canvas.getByRole("main");
    await expect(main.getAttribute("aria-busy")).toBe("true");
    await expect(main.contains(status)).toBe(false);
    await expect(canvasElement.querySelector("[data-slot='skeleton']")).not.toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Configurar competición" })).toBeNull();
    await expect(canvas.queryByLabelText("Nombre de la competición")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Continuar" })).toBeNull();
    await expect(
      canvas.queryByRole("navigation", { name: "Configuración de competición" }),
    ).toBeNull();
  },
};

export const LoadingNarrow: Story = {
  name: "Cargando (estrecho)",
  args: { scenario: "loading" },
  globals: { viewport: { value: "phone390" } },
  parameters: {
    viewport: {
      defaultViewport: "phone390",
      options: {
        phone390: { name: "Phone 390", styles: { width: "390px", height: "844px" } },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = await canvas.findByRole("status", { name: "Cargando competición…" });
    const main = canvas.getByRole("main");
    await expect(main.contains(status)).toBe(false);
    await expect(main.getAttribute("aria-busy")).toBe("true");
    await expect(canvasElement.querySelector("[data-slot='skeleton']")).not.toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Configurar competición" })).toBeNull();
    await expect(main.scrollWidth).toBeLessThanOrEqual(main.clientWidth);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const LoadError: Story = {
  name: "Error al cargar",
  args: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.findByText("No se pudo cargar el borrador de la competición."),
    ).resolves.toBeVisible();
    await expect(canvas.queryByRole("status", { name: "Cargando competición…" })).toBeNull();
    await expect(canvas.queryByRole("heading", { name: "Configurar competición" })).toBeNull();
  },
};
