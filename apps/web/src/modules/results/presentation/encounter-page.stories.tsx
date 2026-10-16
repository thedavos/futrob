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
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView, m1, m2, m3, m4, m5, readyCandidates } from "./encounter-page.fixtures.ts";
import { EncounterPageView, type CandidatesState, type EncounterState } from "./encounter-page.tsx";
import {
  REVIEW_SCENARIOS,
  useStoryDisputeReview,
  type ReviewScenario,
} from "./dispute-review.story-state.ts";
import { approvalReason, disputeReason, rejectionReason } from "./official-selection.fixtures.ts";
import {
  SELECTION_SCENARIOS,
  useStoryTeamSelection,
  type SelectionScenario,
} from "./team-selection.story-state.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 360,
    paddingInline: "1rem",
  },
});

type Scenario =
  | "aggregate"
  | "independent"
  | "singleMatch"
  | "modeUnknown"
  | "noCandidates"
  | "awayNotConnected"
  | "providerMismatch"
  | "candidatesRestricted"
  | "candidatesError"
  | "refreshFailed"
  | "loading"
  | "notFound"
  | "forbidden"
  | "error";

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
  /** Team panel of a representative; omitted for spectators. */
  readonly selection?: SelectionScenario;
  /** Organization review panel of a results approver; omitted for everyone else. */
  readonly review?: ReviewScenario;
};

const noop = () => undefined;
const updatedAt = Date.parse("2026-09-17T03:00:00.000Z");

const candidatesReady = (
  data: Extract<CandidatesState, { kind: "ready" }>["data"],
  refreshFailed = false,
): CandidatesState => ({
  kind: "ready",
  data,
  updatedAt,
  refreshing: false,
  refreshFailed,
  refresh: noop,
});

function stateFor(scenario: Scenario): {
  readonly encounter: EncounterState;
  readonly candidates: CandidatesState;
} {
  const ready = (view = encounterView()): EncounterState => ({ kind: "ready", view });
  const list = candidatesReady(readyCandidates([m1, m3, m2, m4, m5]));
  switch (scenario) {
    case "aggregate":
      return { encounter: ready(), candidates: list };
    case "independent":
      return {
        encounter: ready(encounterView({ resolutionMode: "independent_matches" })),
        candidates: list,
      };
    case "singleMatch":
      return {
        encounter: ready(
          encounterView({
            officialMatchCount: 1,
            resolutionMode: "independent_matches",
            officialMatches: [{ officialSlot: 1, scheduledStartAt: "2026-09-15T01:00:00.000Z" }],
          }),
        ),
        candidates: candidatesReady(readyCandidates([m1, m3])),
      };
    case "modeUnknown":
      return {
        encounter: ready(encounterView({ resolutionMode: null, round: null })),
        candidates: list,
      };
    case "noCandidates":
      return { encounter: ready(), candidates: candidatesReady(readyCandidates([])) };
    case "awayNotConnected":
      return {
        encounter: ready(),
        candidates: candidatesReady({ status: "clubs_not_connected", sides: ["away"] }),
      };
    case "providerMismatch":
      return { encounter: ready(), candidates: candidatesReady({ status: "provider_mismatch" }) };
    case "candidatesRestricted":
      return { encounter: ready(), candidates: { kind: "forbidden" } };
    case "candidatesError":
      return { encounter: ready(), candidates: { kind: "error", retry: noop } };
    case "refreshFailed":
      return { encounter: ready(), candidates: candidatesReady(readyCandidates([m1, m2]), true) };
    case "loading":
      return { encounter: { kind: "loading" }, candidates: { kind: "loading" } };
    case "notFound":
      return { encounter: { kind: "not_found" }, candidates: { kind: "loading" } };
    case "forbidden":
      return { encounter: { kind: "forbidden" }, candidates: { kind: "loading" } };
    case "error":
      return { encounter: { kind: "error", retry: noop }, candidates: { kind: "loading" } };
    default: {
      const exhaustive: never = scenario;
      return exhaustive;
    }
  }
}

function ScenarioPage({
  review,
  scenario,
  selection,
}: {
  readonly review?: ReviewScenario;
  readonly scenario: Scenario;
  readonly selection?: SelectionScenario;
}) {
  return (
    <EncounterPageView
      competitionId="competition-1"
      disputeReview={useStoryDisputeReview(review)}
      organizationId="org-1"
      teamSelection={useStoryTeamSelection(selection)}
      {...stateFor(scenario)}
    />
  );
}

function EncounterStory({ locale, narrow = false, review, scenario, selection }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const encounterRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <ScenarioPage review={review} scenario={scenario} selection={selection} />,
    });
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => <p>Enfrentamientos</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([encounterRoute, listRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/encounters/encounter-1"],
      }),
    });
  }, [review, scenario, selection]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const scenarios: readonly Scenario[] = [
  "aggregate",
  "independent",
  "singleMatch",
  "modeUnknown",
  "noCandidates",
  "awayNotConnected",
  "providerMismatch",
  "candidatesRestricted",
  "candidatesError",
  "refreshFailed",
  "loading",
  "notFound",
  "forbidden",
  "error",
];

const meta = {
  title: "Product/Competition/Encounter",
  parameters: { layout: "fullscreen" },
  args: { scenario: "aggregate", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: scenarios },
    locale: { control: "inline-radio", options: ["es", "en"] },
    selection: { control: "select", options: [undefined, ...SELECTION_SCENARIOS] },
    review: { control: "select", options: [undefined, ...REVIEW_SCENARIOS] },
  },
  render: (args) => (
    <EncounterStory
      key={`${args.scenario}-${args.locale}-${args.selection}-${args.review}`}
      {...args}
    />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const AggregatePreview: Story = {
  name: "Vista previa agregada",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" }),
    ).toBeInTheDocument();
    const rows = within(canvas.getByRole("list", { name: "Partidos EA candidatos" }));
    await userEvent.click(
      within(rows.getAllByRole("listitem")[0]!).getByRole("button", { name: "Usar en partido 1" }),
    );
    await userEvent.click(
      within(rows.getAllByRole("listitem")[2]!).getByRole("button", { name: "Usar en partido 2" }),
    );
    const aggregate = within(canvas.getByRole("group", { name: "Global" }));
    await expect(aggregate.getByText("1–2")).toBeVisible();
    await expect(aggregate.getByText("Gana Maderas FC")).toBeVisible();
  },
};

export const IndependentMatches: Story = { args: { scenario: "independent" } };

export const SingleMatch: Story = { args: { scenario: "singleMatch" } };

export const ResolutionUnknown: Story = { args: { scenario: "modeUnknown" } };

export const NoCandidates: Story = { args: { scenario: "noCandidates" } };

export const AwayClubNotConnected: Story = {
  args: { scenario: "awayNotConnected" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Maderas FC no tiene un club EA conectado."),
    ).toBeVisible();
  },
};

export const ProviderMismatch: Story = { args: { scenario: "providerMismatch" } };

export const CandidatesRestricted: Story = { args: { scenario: "candidatesRestricted" } };

export const CandidatesError: Story = { args: { scenario: "candidatesError" } };

export const RefreshFailedWithCachedCandidates: Story = { args: { scenario: "refreshFailed" } };

export const Loading: Story = { args: { scenario: "loading" } };

export const NotFound: Story = { args: { scenario: "notFound" } };

export const Forbidden: Story = { args: { scenario: "forbidden" } };

export const ErrorState: Story = { args: { scenario: "error" } };

export const English: Story = { args: { scenario: "aggregate", locale: "en" } };

export const Narrow360: Story = {
  name: "360 px",
  args: { scenario: "aggregate", narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" });
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};

export const SelectionNotProposed: Story = {
  name: "Selección: sin propuesta",
  args: { selection: "none" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = within(await canvas.findByRole("region", { name: "Selección oficial" }));
    await expect(panel.getByText("Aún no hay propuesta")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Proponer selección" })).toBeVisible();
  },
};

export const SelectionPendingAsProposer: Story = {
  name: "Selección: pendiente, como proponente",
  args: { selection: "pendingAsProposer" },
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("region", { name: "Selección oficial" }),
    );
    await expect(panel.getByText("Esperando confirmación del rival")).toBeVisible();
    await expect(panel.queryByRole("button", { name: "Confirmar propuesta" })).toBeNull();
  },
};

export const SelectionPendingAsRival: Story = {
  name: "Selección: pendiente, como rival",
  args: { selection: "pendingAsRival" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const panel = within(
      await within(canvasElement).findByRole("region", { name: "Selección oficial" }),
    );
    for (const name of [
      "Confirmar propuesta",
      "Rechazar",
      "Proponer alternativa",
      "Abrir disputa",
    ]) {
      await expect(panel.getByRole("button", { name })).toBeVisible();
    }
  },
};

export const SelectionConflictRecovery: Story = {
  name: "Selección: conflicto de versión",
  args: { selection: "conflict" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await canvas.findByRole("button", { name: "Rechazar" }));
    const dialog = within(await page.findByRole("dialog", { name: "Rechazar la propuesta" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Motivo" }), rejectionReason);
    await userEvent.click(dialog.getByRole("button", { name: "Rechazar propuesta" }));
    await expect(await dialog.findByText(/leíste la versión 1 y ahora está en la 2/)).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Motivo" })).toHaveValue(rejectionReason);
  },
};

export const SelectionApproved: Story = {
  name: "Selección: aprobada",
  args: { selection: "approved" },
};

export const SelectionDisputed: Story = {
  name: "Selección: en disputa (solo lectura)",
  args: { selection: "disputed" },
  parameters: { a11y: { test: "error" } },
};

export const SelectionUnderReviewWithFlags: Story = {
  name: "Selección: revisión con avisos",
  args: { selection: "underReview" },
};

export const SelectionReaderWithoutCommands: Story = {
  name: "Selección: sin acciones",
  args: { selection: "reader" },
};

export const SelectionBothSides: Story = {
  name: "Selección: representa a ambos equipos",
  args: { selection: "bothSides" },
};

export const SelectionForbidden: Story = {
  name: "Selección: sin acceso",
  args: { selection: "forbidden" },
};

export const SelectionLoading: Story = {
  name: "Selección: cargando",
  args: { selection: "loading" },
};

export const SelectionError: Story = {
  name: "Selección: error",
  args: { selection: "error" },
};

export const SelectionEnglish: Story = {
  name: "Selection: pending as rival (EN)",
  args: { selection: "pendingAsRival", locale: "en" },
};

export const SelectionNarrow360: Story = {
  name: "Selección: 360 px",
  args: { selection: "pendingAsRival", narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("region", { name: "Selección oficial" });
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};

const REVIEW = "Revisión de la organización";

export const ReviewLoading: Story = {
  name: "Revisión: cargando",
  args: { review: "loading" },
};

export const ReviewForbidden: Story = {
  name: "Revisión: sin acceso",
  args: { review: "forbidden" },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await expect(
      panel.getByText("No puedes revisar disputas de este enfrentamiento."),
    ).toBeVisible();
    await expect(panel.queryByRole("tab")).toBeNull();
  },
};

export const ReviewDisputed: Story = {
  name: "Revisión: en disputa, tomar el caso",
  args: { review: "disputed" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await expect(panel.getByText("En disputa")).toBeVisible();
    await expect(panel.getByText(disputeReason)).toBeVisible();
    await expect(panel.getByRole("button", { name: "Tomar el caso" })).toBeVisible();
  },
};

export const ReviewOrganizerReview: Story = {
  name: "Revisión: aprobar con avisos o devolver",
  args: { review: "organizerReview" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await expect(panel.getByRole("button", { name: "Devolver a selección" })).toBeVisible();
    await userEvent.click(panel.getByRole("button", { name: "Aprobar una propuesta" }));
    const dialog = within(await page.findByRole("dialog", { name: "Aprobar una propuesta" }));
    await userEvent.click(
      dialog.getByRole("radio", { name: "Propuesta 2 · ronda 1 · De Maderas FC" }),
    );
    await waitFor(() =>
      expect(dialog.getByText("Hubo desconexión en el partido EA m-3")).toBeVisible(),
    );
    await expect(
      dialog.getByRole("checkbox", {
        name: "Revisé los avisos de integridad y apruebo igualmente",
      }),
    ).toBeVisible();
  },
};

export const ReviewRematch: Story = {
  name: "Revisión: mismo marcador, otro partido EA",
  args: { review: "rematch" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await userEvent.click(panel.getByRole("button", { name: "Aprobar una propuesta" }));
    const dialog = within(await page.findByRole("dialog", { name: "Aprobar una propuesta" }));
    const first = dialog.getByRole("radio", { name: "Propuesta 1 · ronda 1 · De Cuervos FC" });
    const second = dialog.getByRole("radio", { name: "Propuesta 2 · ronda 1 · De Maderas FC" });
    await waitFor(() => expect(within(first).getByText(/^Partido EA m-2 · jugado/)).toBeVisible());
    await expect(within(second).getByText(/^Partido EA m-5 · jugado/)).toBeVisible();
  },
};

export const ReviewApproved: Story = {
  name: "Revisión: aprobada X/Z, con historial",
  args: { review: "approved" },
  play: async ({ canvasElement }) => {
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await expect(panel.getByRole("group", { name: "Partidos aprobados" })).toBeVisible();
    await userEvent.click(panel.getByRole("tab", { name: "Historial" }));
    await waitFor(() => expect(panel.getByText("Disputa resuelta con aprobación")).toBeVisible());
  },
};

export const ReviewReturned: Story = {
  name: "Revisión: devuelta a selección",
  args: { review: "returned" },
};

export const ReviewConflict: Story = {
  name: "Revisión: conflicto de versión",
  args: { review: "conflict" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await userEvent.click(panel.getByRole("button", { name: "Aprobar una propuesta" }));
    const dialog = within(await page.findByRole("dialog", { name: "Aprobar una propuesta" }));
    await userEvent.click(
      dialog.getByRole("radio", { name: "Propuesta 2 · ronda 1 · De Maderas FC" }),
    );
    await userEvent.type(dialog.getByRole("textbox", { name: "Motivo" }), approvalReason);
    await userEvent.click(dialog.getByRole("button", { name: "Aprobar propuesta" }));
    await expect(await dialog.findByText(/leíste la versión 4 y ahora está en la 5/)).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Motivo" })).toHaveValue(approvalReason);
  },
};

export const ReviewServerFailure: Story = {
  name: "Revisión: fallo del servidor y reintento",
  args: { review: "failure" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const panel = within(await within(canvasElement).findByRole("region", { name: REVIEW }));
    await userEvent.click(panel.getByRole("button", { name: "Devolver a selección" }));
    const dialog = within(
      await page.findByRole("dialog", { name: "Devolver el caso a selección" }),
    );
    await userEvent.type(dialog.getByRole("textbox", { name: "Motivo" }), "Fuera de horario.");
    await userEvent.click(dialog.getByRole("button", { name: "Devolver a selección" }));
    await expect(await dialog.findByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Motivo" })).toHaveValue("Fuera de horario.");
  },
};

export const ReviewEnglish: Story = {
  name: "Review: organizer review (EN)",
  args: { review: "organizerReview", locale: "en" },
};

export const ReviewNarrow360: Story = {
  name: "Revisión: 360 px",
  args: { review: "organizerReview", narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("region", { name: REVIEW });
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};
