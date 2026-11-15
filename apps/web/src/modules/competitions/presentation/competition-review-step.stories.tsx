import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import type {
  CompetitionDraftDto,
  CompetitionEntryDto,
  CompetitionFormatDto,
  CompetitionMatchRulesDto,
  TeamDto,
} from "@futrob/api-contracts";
import { ReviewStep } from "./competition-review-step.tsx";

const styles = stylex.create({
  frame: {
    maxWidth: "72rem",
  },
});

const stage = (count: 1 | 2): CompetitionMatchRulesDto => ({
  officialMatchesPerEncounter: count,
  resolutionMode: count === 1 ? "independent_matches" : "aggregate_score",
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: true,
  maxReschedulesPerTeam: null,
  minimumRescheduleNoticeHours: 24,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: true,
  rescheduleRequiresOrganizerApproval: false,
});

function draft(
  format: CompetitionFormatDto,
  regular: CompetitionMatchRulesDto | null,
  knockout: CompetitionMatchRulesDto | null,
): CompetitionDraftDto {
  return {
    competition: {
      id: "competition-1",
      organizationId: "org-1",
      name: "Liga Interclubes",
      status: "draft",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "nintendo-switch-2",
      region: "south-america",
      timeZone: "America/Lima",
      format,
      teams: { min: 2, max: null },
      schedule:
        format === "league"
          ? { startsOn: null, endsOn: null }
          : { startsOn: "2026-10-12", endsOn: "2026-12-20" },
      cover: { kind: "preset", preset: "league" },
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
    rules: {
      version: 1,
      regularStage: regular,
      knockoutStage: knockout,
      awayGoalsEnabled: false,
      maxRosterSize: 11,
      rankingEligibility: null,
      createdAt: "2026-10-01T00:00:00.000Z",
    },
  };
}

const teams: readonly TeamDto[] = [
  {
    id: "team-norte",
    organizationId: "org-1",
    name: "Norte FC",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "team-sur",
    organizationId: "org-1",
    name: "Sur FC",
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

const approved: readonly CompetitionEntryDto[] = teams.map((team) => ({
  id: `entry-${team.id}`,
  organizationId: "org-1",
  competitionId: "competition-1",
  teamId: team.id,
  status: "approved",
  createdAt: "2026-10-02T00:00:00.000Z",
}));

const meta = {
  title: "Product/Organizer/Competition setup/Review step",
  component: ReviewStep,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div {...applyStyles(styles.frame)}>
        <Story />
      </div>
    ),
  ],
  args: {
    draft: draft("league", stage(1), null),
    participants: [],
    teams: [],
    onEdit: fn(),
  },
} satisfies Meta<typeof ReviewStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Resumen de configuración" })).toBeVisible();
    await expect(canvas.getByText("Sin definir")).toBeVisible();
    await expect(canvas.getByText("Aún no hay equipos confirmados.")).toBeVisible();
    await expect(canvas.getAllByText("0 equipos").length).toBeGreaterThan(0);
    await expect(canvas.getByText("Información completa").closest("li")).toHaveTextContent("Listo");
    await expect(canvas.getByText("Mínimo de equipos cumplido").closest("li")).toHaveTextContent(
      "Pendiente",
    );
    await expect(canvas.queryByText(/vueltas/i)).toBeNull();
    await expect(canvas.queryByText(/reglamento/i)).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Editar Formato" }));
    await expect(args.onEdit).toHaveBeenCalledWith("format");
  },
};

export const Ready: Story = {
  args: {
    draft: draft("league-playoffs", stage(1), stage(2)),
    participants: approved,
    teams,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("12 oct 2026 – 20 dic 2026")).toBeVisible();
    await expect(canvas.getByText("Norte FC")).toBeVisible();
    await expect(canvas.getByText("Sur FC")).toBeVisible();
    await expect(
      canvas.getByText(
        "Etapa regular: 1 partido por enfrentamiento · Playoffs: 2 partidos por enfrentamiento",
      ),
    ).toBeVisible();
    await expect(canvas.getByText("Mínimo de equipos cumplido").closest("li")).toHaveTextContent(
      "Listo",
    );
    await expect(canvas.getByText("Las fechas se pueden definir después.")).toBeVisible();
    await expect(
      canvas.getByText("Al publicar, la estructura de la competición queda fija."),
    ).toBeVisible();
  },
};
