import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import type { CompetitionSanctionDto } from "@futrob/api-contracts";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  CompetitionSanctionsPageView,
  type CompetitionSanctionsState,
  type SanctionCommands,
} from "./competition-sanctions-page.tsx";
import { TeamSanctionsSectionView, type TeamSanctionsState } from "./team-sanctions-section.tsx";

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

const audit = { imposedByActorId: "actor-organizer", requestId: "req-1" } as const;

const sanctions: readonly CompetitionSanctionDto[] = [
  {
    id: "sanction-1",
    competitionId: "competition-1",
    targetType: "team",
    teamId: "team-1",
    teamName: "Cuervos FC",
    playerProfileId: null,
    playerName: null,
    type: "points_deduction",
    pointsDeducted: 3,
    suspensionMatches: null,
    encounterId: null,
    reason: "Alineación indebida en la jornada 2.",
    imposedAt: "2026-10-14T18:00:00.000Z",
    revocation: null,
    ...audit,
  },
  {
    id: "sanction-2",
    competitionId: "competition-1",
    targetType: "player",
    teamId: "team-2",
    teamName: "Club Atlético Halcones del Pacífico",
    playerProfileId: "player-1",
    playerName: "Diego Ramírez",
    type: "match_suspension",
    pointsDeducted: null,
    suspensionMatches: 2,
    encounterId: null,
    reason: "Conducta antideportiva reiterada en el chat del partido.",
    imposedAt: "2026-10-12T20:30:00.000Z",
    revocation: null,
    ...audit,
  },
  {
    id: "sanction-3",
    competitionId: "competition-1",
    targetType: "team",
    teamId: "team-3",
    teamName: null,
    playerProfileId: null,
    playerName: null,
    type: "warning",
    pointsDeducted: null,
    suspensionMatches: null,
    encounterId: null,
    reason: "Llegó tarde al lobby.",
    imposedAt: "2026-10-10T01:00:00.000Z",
    revocation: {
      actorId: "actor-organizer",
      revokedAt: "2026-10-11T15:00:00.000Z",
      reason: "El retraso fue del servidor.",
      requestId: "req-2",
    },
    ...audit,
  },
];

type Scenario = "ready" | "readOnly" | "empty" | "loading" | "notFound" | "error";

const STATES: Record<Scenario, CompetitionSanctionsState> = {
  ready: { kind: "ready", data: { sanctions: [...sanctions] } },
  readOnly: { kind: "ready", data: { sanctions: [...sanctions] } },
  empty: { kind: "ready", data: { sanctions: [] } },
  loading: { kind: "loading" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry: () => undefined },
};

const commands: SanctionCommands = {
  impose: async () => undefined,
  revoke: async () => undefined,
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function Frame({
  children,
  locale,
  narrow,
}: {
  readonly children: ReactNode;
  readonly locale: Locale;
  readonly narrow: boolean;
}) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { enabled: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
          {children}
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Competition/Sanctions",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: ["ready", "readOnly", "empty", "loading", "notFound", "error"] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: ({ locale, narrow = false, scenario }) => (
    <Frame key={`${scenario}-${locale}`} locale={locale} narrow={narrow}>
      <CompetitionSanctionsPageView
        commands={scenario === "readOnly" ? null : commands}
        competitionId="competition-1"
        organizationId="org-1"
        state={STATES[scenario]}
      />
    </Frame>
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const Ready: Story = {
  name: "Con sanciones",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table", { name: "Sanciones de la competición" });
    await expect(within(table).getByText("−3 puntos")).toBeVisible();
    await expect(within(table).getByText("Revocada")).toBeVisible();
    // Revoked rows keep their audit trail but offer no second revoke.
    await expect(within(table).getAllByRole("button", { name: "Revocar" })).toHaveLength(2);
    await expect(canvas.getByRole("button", { name: "Sancionar" })).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con sanciones · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const ReadOnly: Story = {
  name: "Solo lectura",
  args: { scenario: "readOnly" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("table", { name: "Sanciones de la competición" });
    await expect(canvas.queryByRole("button", { name: "Sancionar" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Revocar" })).toBeNull();
  },
};

export const Empty: Story = { name: "Sin sanciones", args: { scenario: "empty" } };

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "Sin permiso", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };

const TEAM_STATES: Record<
  "ready" | "empty" | "forbidden" | "loading" | "error",
  TeamSanctionsState
> = {
  ready: {
    kind: "ready",
    data: { sanctions: sanctions.filter((sanction) => sanction.targetType === "team") },
  },
  empty: { kind: "ready", data: { sanctions: [] } },
  forbidden: { kind: "forbidden" },
  loading: { kind: "loading" },
  error: { kind: "error", retry: () => undefined },
};

export const TeamView: Story = {
  name: "Mi equipo · sanciones",
  render: ({ locale }) => (
    <Frame locale={locale} narrow={false}>
      <TeamSanctionsSectionView state={TEAM_STATES.ready} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = await canvas.findByRole("table", { name: "Sanciones del equipo" });
    await expect(within(table).queryByRole("button")).toBeNull();
  },
};

export const TeamViewEmpty: Story = {
  name: "Mi equipo · sin sanciones",
  render: ({ locale }) => (
    <Frame locale={locale} narrow={false}>
      <TeamSanctionsSectionView state={TEAM_STATES.empty} />
    </Frame>
  ),
};

export const TeamViewLoading: Story = {
  name: "Mi equipo · cargando",
  render: ({ locale }) => (
    <Frame locale={locale} narrow={false}>
      <TeamSanctionsSectionView state={TEAM_STATES.loading} />
    </Frame>
  ),
};

export const TeamViewError: Story = {
  name: "Mi equipo · error",
  render: ({ locale }) => (
    <Frame locale={locale} narrow={false}>
      <TeamSanctionsSectionView state={TEAM_STATES.error} />
    </Frame>
  ),
};

export const TeamViewForbidden: Story = {
  name: "Mi equipo · sin permiso",
  render: ({ locale }) => (
    <Frame locale={locale} narrow={false}>
      <TeamSanctionsSectionView state={TEAM_STATES.forbidden} />
    </Frame>
  ),
};
