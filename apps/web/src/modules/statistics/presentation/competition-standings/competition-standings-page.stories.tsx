import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import type { CompetitionStandingSnapshotDto } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { teamNamesFrom } from "./competition-standings-model.ts";
import {
  CompetitionStandingsPageView,
  type CompetitionStandingsState,
} from "./competition-standings-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: { width: 360, paddingInline: "1rem" },
});

const row = (
  position: number,
  teamId: string,
  [played, wins, draws, losses, goalsFor, goalsAgainst]: readonly number[],
  form: CompetitionStandingSnapshotDto["rows"][number]["form"] = [],
  pointsDeducted?: number,
) => ({
  position,
  teamId,
  played: played!,
  wins: wins!,
  draws: draws!,
  losses: losses!,
  goalsFor: goalsFor!,
  goalsAgainst: goalsAgainst!,
  goalDifference: goalsFor! - goalsAgainst!,
  points: wins! * 3 + draws! - (pointsDeducted ?? 0),
  ...(pointsDeducted ? { pointsDeducted } : {}),
  form,
});

const snapshot: CompetitionStandingSnapshotDto = {
  competitionId: "competition-1",
  organizationId: "org-1",
  formulaVersion: "points-gd-gf-v1",
  rows: [
    row(1, "team-1", [7, 6, 0, 1, 15, 7], ["win", "win", "win", "win", "win"]),
    row(2, "team-2", [7, 3, 2, 2, 12, 8], ["win", "win", "draw", "win", "loss"]),
    row(3, "team-5", [6, 3, 0, 3, 9, 12], ["win", "win", "loss", "win", "loss"]),
    row(4, "team-3", [6, 2, 2, 2, 8, 8], ["win", "loss", "draw", "draw", "loss"]),
    row(5, "team-6", [5, 0, 3, 2, 4, 7], ["draw", "draw", "loss", "draw", "loss"]),
    row(6, "team-4", [5, 0, 1, 4, 3, 9], ["draw", "loss", "loss", "loss", "loss"]),
  ],
  sourceRevisionMax: 18,
  updatedAt: "2026-11-04T19:15:00.000Z",
  playoffSpots: null,
  swiss: null,
};

const playoffSnapshot: CompetitionStandingSnapshotDto = {
  ...snapshot,
  playoffSpots: 4,
};

const sanctionedSnapshot: CompetitionStandingSnapshotDto = {
  ...snapshot,
  playoffSpots: 4,
  rows: [
    row(1, "team-1", [7, 6, 0, 1, 15, 7], ["win", "win", "win", "win", "win"]),
    row(2, "team-5", [6, 3, 0, 3, 9, 12], ["win", "win", "loss", "win", "loss"]),
    row(3, "team-2", [7, 3, 2, 2, 12, 8], ["win", "win", "draw", "win", "loss"], 3),
    row(4, "team-3", [6, 2, 2, 2, 8, 8], ["win", "loss", "draw", "draw", "loss"]),
    row(5, "team-6", [5, 0, 3, 2, 4, 7], ["draw", "draw", "loss", "draw", "loss"]),
    row(6, "team-4", [5, 0, 1, 4, 3, 9], ["draw", "loss", "loss", "loss", "loss"]),
  ],
};

const zeroPlayedSnapshot: CompetitionStandingSnapshotDto = {
  ...snapshot,
  rows: [row(1, "team-1", [0, 0, 0, 0, 0, 0], []), row(2, "team-2", [0, 0, 0, 0, 0, 0], [])],
};

const swissRow = (
  position: number,
  teamId: string,
  figures: readonly number[],
  swiss: NonNullable<CompetitionStandingSnapshotDto["rows"][number]["swiss"]>,
  points: number,
  form: CompetitionStandingSnapshotDto["rows"][number]["form"] = [],
) => ({ ...row(position, teamId, figures, form), points, swiss });

const swissSnapshot: CompetitionStandingSnapshotDto = {
  ...snapshot,
  formulaVersion: "swiss-points-buchholz-gd-gf-v1",
  rows: [
    swissRow(1, "team-1", [3, 3, 0, 0, 9, 2], { buchholz: 12, byes: 0, withdrawn: false }, 9, [
      "win",
      "win",
      "win",
    ]),
    swissRow(2, "team-3", [2, 2, 0, 0, 5, 1], { buchholz: 9, byes: 1, withdrawn: false }, 9, [
      "win",
      "win",
    ]),
    swissRow(3, "team-2", [3, 1, 0, 2, 4, 6], { buchholz: 7, byes: 0, withdrawn: false }, 3, [
      "loss",
      "win",
      "loss",
    ]),
    swissRow(4, "team-4", [2, 0, 0, 2, 1, 7], { buchholz: 6, byes: 1, withdrawn: true }, 3, [
      "loss",
      "loss",
    ]),
  ],
  swiss: { roundsTotal: 5, roundsCompleted: 3, currentRound: 4, isFinal: false },
};

const swissFinalSnapshot: CompetitionStandingSnapshotDto = {
  ...swissSnapshot,
  swiss: { roundsTotal: 5, roundsCompleted: 5, currentRound: null, isFinal: true },
};

const names = {
  kind: "ready",
  byId: teamNamesFrom([
    { id: "team-1", name: "Real Vicuña" },
    { id: "team-2", name: "Deportivo Llama" },
    { id: "team-3", name: "Club Atlético Inti United del Pacífico" },
    { id: "team-4", name: "Cóndores FC" },
    { id: "team-5", name: "Atlético Pumas" },
    { id: "team-6", name: "Sporting Quipu" },
  ]),
} as const;

type Scenario =
  | "ready"
  | "playoffs"
  | "sanction"
  | "zeroPlayed"
  | "swiss"
  | "swissFinal"
  | "namesLoading"
  | "namesError"
  | "refreshFailed"
  | "empty"
  | "emptyNoEncounters"
  | "emptyRefreshFailed"
  | "loading"
  | "forbidden"
  | "notFound"
  | "accessError"
  | "error";

const noop = () => undefined;
type ReadyState = Extract<CompetitionStandingsState, { kind: "ready" }>;
const ready = (
  teamNames: ReadyState["names"],
  standings: CompetitionStandingSnapshotDto = snapshot,
  canViewEncounters = true,
): CompetitionStandingsState => ({
  kind: "ready",
  snapshot: standings,
  names: teamNames,
  canViewEncounters,
  refreshFailed: false,
  namesRefreshFailed: false,
  retry: noop,
  retryNames: noop,
});

function stateFor(scenario: Scenario, canViewEncounters: boolean): CompetitionStandingsState {
  switch (scenario) {
    case "ready":
      return ready(names, snapshot, canViewEncounters);
    case "playoffs":
      return ready(names, playoffSnapshot, canViewEncounters);
    case "sanction":
      return ready(names, sanctionedSnapshot, canViewEncounters);
    case "zeroPlayed":
      return ready(names, zeroPlayedSnapshot, canViewEncounters);
    case "swiss":
      return ready(names, swissSnapshot, canViewEncounters);
    case "swissFinal":
      return ready(names, swissFinalSnapshot, canViewEncounters);
    case "namesLoading":
      return ready({ kind: "loading" }, snapshot, canViewEncounters);
    case "namesError":
      return ready({ kind: "unavailable" }, snapshot, canViewEncounters);
    case "refreshFailed":
      return {
        kind: "ready",
        snapshot,
        names,
        canViewEncounters,
        refreshFailed: true,
        namesRefreshFailed: true,
        retry: noop,
        retryNames: noop,
      };
    case "empty":
      return { kind: "empty", refreshFailed: false, canViewEncounters: true, retry: noop };
    case "emptyNoEncounters":
      return { kind: "empty", refreshFailed: false, canViewEncounters: false, retry: noop };
    case "emptyRefreshFailed":
      return { kind: "empty", refreshFailed: true, canViewEncounters: true, retry: noop };
    case "loading":
      return { kind: "loading" };
    case "forbidden":
      return { kind: "forbidden" };
    case "notFound":
      return { kind: "not_found" };
    case "accessError":
      return { kind: "access_error", retry: noop };
    case "error":
      return { kind: "error", retry: noop };
    default: {
      const exhaustive: never = scenario;
      return exhaustive;
    }
  }
}

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow: boolean;
  readonly canViewEncounters: boolean;
};

function StandingsStory({ canViewEncounters, locale, narrow, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/standings",
      component: () => (
        <CompetitionStandingsPageView
          competitionId="competition-1"
          organizationId="org-1"
          state={stateFor(scenario, canViewEncounters)}
        />
      ),
    });
    const org = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId",
      component: () => <p>Organización</p>,
    });
    const competitions = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions",
      component: () => <p>Competiciones</p>,
    });
    const encounters = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => <p>Enfrentamientos</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([page, org, competitions, encounters]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/standings"],
      }),
    });
  }, [canViewEncounters, scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Competition/Standings",
  parameters: { layout: "fullscreen" },
  args: { scenario: "playoffs", locale: "es", narrow: false, canViewEncounters: true },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "ready",
        "playoffs",
        "sanction",
        "zeroPlayed",
        "swiss",
        "swissFinal",
        "namesLoading",
        "namesError",
        "refreshFailed",
        "empty",
        "emptyNoEncounters",
        "emptyRefreshFailed",
        "loading",
        "forbidden",
        "notFound",
        "accessError",
        "error",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
    narrow: { control: "boolean" },
    canViewEncounters: { control: "boolean" },
  },
  render: (args) => (
    <StandingsStory
      key={`${args.scenario}-${args.locale}-${args.narrow}-${args.canViewEncounters}`}
      {...args}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  parameters: { a11y: { test: "error" } },
};

export const Ready: Story = {
  name: "Con clasificación",
  args: { scenario: "ready" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Real Vicuña")).toBeVisible();
    await expect(canvas.getByText("Oficial")).toBeVisible();
    await expect(canvas.getByText("Desempate: Puntos → DG → GF")).toBeVisible();
    await expect(canvas.getByText("18 pts")).toBeVisible();
    await expect(canvas.getByText("Mejor ataque")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver enfrentamientos" })).toBeVisible();
  },
};

export const Playoffs: Story = {
  name: "Con corte de playoff",
  args: { scenario: "playoffs" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Los cuatro primeros pasan al playoff")).toBeVisible();
    await expect(canvas.getByText("Corte de clasificación")).toBeVisible();
  },
};

export const WithSanctionDeduction: Story = {
  name: "Con sanción de puntos",
  args: { scenario: "sanction" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Deportivo Llama")).toBeVisible();
    await expect(canvas.getByText("−3 pts")).toBeVisible();
  },
};

export const ZeroPlayed: Story = {
  name: "Sin partidos jugados aún",
  args: { scenario: "zeroPlayed", canViewEncounters: false },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("0 pts")).toBeVisible();
    await expect(canvas.getAllByText("Sin datos")).toHaveLength(2);
    await expect(canvas.queryByRole("link", { name: "Ver enfrentamientos" })).toBeNull();
  },
};

export const PlayoffsEnglishNarrow: Story = {
  name: "Con corte de playoff · EN 360",
  args: { scenario: "playoffs", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("The top four advance to the playoffs")).toBeVisible();
    await expect(canvas.getByText("Tiebreaker: Points → GD → GF")).toBeVisible();
  },
};

export const Swiss: Story = {
  name: "Suizo · en curso",
  args: { scenario: "swiss" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Ronda 4 de 5")).toBeVisible();
    await expect(canvas.getByTitle("Buchholz: suma de los puntos de los rivales")).toBeVisible();
    await expect(canvas.getByText("Retirado")).toBeVisible();
    await expect(canvas.getAllByText("1 descanso")).toHaveLength(2);
  },
};

export const SwissFinal: Story = {
  name: "Suizo · final",
  args: { scenario: "swissFinal" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Clasificación final")).toBeVisible();
    await expect(canvas.queryByText(/Ronda \d/)).toBeNull();
  },
};

export const SwissEnglishNarrow: Story = {
  name: "Suizo · EN 360",
  args: { scenario: "swiss", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Round 4 of 5")).toBeVisible();
    await expect(canvas.getByText("Withdrawn")).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con clasificación · EN 360",
  args: { scenario: "ready", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const NamesLoading: Story = { name: "Nombres cargando", args: { scenario: "namesLoading" } };
export const NamesError: Story = {
  name: "Nombres no disponibles",
  args: { scenario: "namesError" },
};
export const RefreshFailed: Story = {
  name: "Actualización fallida con datos previos",
  args: { scenario: "refreshFailed" },
};
export const Empty: Story = {
  name: "Sin resultados aprobados",
  args: { scenario: "empty" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Aún no hay clasificación oficial")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver enfrentamientos" })).toBeVisible();
  },
};
export const EmptyEnglishNarrow: Story = {
  name: "Sin resultados aprobados · EN 360",
  args: { scenario: "empty", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const action = await canvas.findByRole("link", { name: "View encounters" });
    await expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};
export const EmptyNoEncounters: Story = {
  name: "Sin resultados · sin acceso a enfrentamientos",
  args: { scenario: "emptyNoEncounters" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Aún no hay clasificación oficial")).toBeVisible();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};
export const EmptyRefreshFailed: Story = {
  name: "Sin resultados · actualización fallida",
  args: { scenario: "emptyRefreshFailed" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.getByText("Aún no hay clasificación oficial")).toBeVisible();
  },
};
export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const Forbidden: Story = {
  name: "Sin permiso",
  args: { scenario: "forbidden" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No tienes acceso a la clasificación")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Volver a la organización" })).toBeVisible();
  },
};
export const NotFound: Story = {
  name: "Competición no encontrada",
  args: { scenario: "notFound" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("No encontramos esta competición")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver competiciones" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: "Volver a la organización" })).toBeNull();
  },
};
export const NotFoundEnglishNarrow: Story = {
  name: "Competición no encontrada · EN 360",
  args: { scenario: "notFound", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};
export const AccessError: Story = { name: "Error de acceso", args: { scenario: "accessError" } };
export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
