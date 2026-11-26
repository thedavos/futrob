import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionTeamsView, type CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { teamManagementFixture, teamSummaryFixture } from "./competition-teams-view.fixtures.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    padding: "1.5rem",
    backgroundColor: colors.background,
  },
});

const noOp = async () => undefined;
const detail = teamManagementFixture();
const approvedTeam = {
  ...teamManagementFixture({ memberCount: 4, maxSize: 12 }),
  team: { ...detail.team, id: "team-2", name: "Atlético Pumas" },
  entry: { ...detail.entry, id: "entry-2", teamId: "team-2", status: "approved" as const },
  externalClub: {
    ...detail.externalClub!,
    teamId: "team-2",
    externalClubId: "club-2",
    externalClubName: "Atletico Pumas FC",
  },
};
const missingClubTeam = {
  ...teamManagementFixture({ memberCount: 1, maxSize: 12 }),
  team: { ...detail.team, id: "team-3", name: "Halcones Sin Club" },
  entry: { ...detail.entry, id: "entry-3", teamId: "team-3", status: "approved" as const },
  externalClub: null,
  members: detail.members.slice(0, 1),
};

const defaultArgs: CompetitionTeamsViewProps = {
  items: [
    teamSummaryFixture(approvedTeam),
    teamSummaryFixture(detail),
    teamSummaryFixture(missingClubTeam),
  ],
  detail,
  selectedTeamId: detail.team.id,
  capabilities: {
    manageRoster: true,
    manageRoles: true,
    manageInvitations: true,
    manageExternalClub: true,
    manageEntries: true,
    unavailable: false,
  },
  onSelectTeam: () => undefined,
  onChangeRole: noOp,
  onSetRosterOpen: noOp,
  onCreateInvitation: noOp,
  onSearchClubs: async () => [],
  onConnectClub: noOp,
  onDecideEntry: noOp,
};

const meta = {
  title: "Product/Competition/Teams console",
  component: CompetitionTeamsView,
  parameters: { layout: "fullscreen" },
  args: defaultArgs,
  decorators: [
    (Story) => (
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <div {...applyStyles(styles.frame)}>
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof CompetitionTeamsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyRoster: Story = {
  args: {
    detail: { ...detail, roster: { ...detail.roster, memberCount: 0 }, members: [] },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Sin jugadores registrados")).toBeVisible();
  },
};

export const MissingExternalClub: Story = {
  args: {
    detail: missingClubTeam,
    selectedTeamId: missingClubTeam.team.id,
  },
};

export const FullRoster: Story = {
  args: {
    detail: teamManagementFixture({ memberCount: 11, maxSize: 11 }),
    items: [teamSummaryFixture(teamManagementFixture({ memberCount: 11, maxSize: 11 }))],
  },
};

export const ClosedRoster: Story = {
  args: {
    detail: teamManagementFixture({ state: "closed", lockedAt: "2026-08-11T12:00:00.000Z" }),
    items: [
      teamSummaryFixture(
        teamManagementFixture({
          state: "closed",
          lockedAt: "2026-08-11T12:00:00.000Z",
        }),
      ),
    ],
  },
};

export const InvitationCreated: Story = {
  args: {
    invitationUrl: "https://app.futrob.com/roster-invitations/accept/roster-token",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Invitar" }));
    await waitFor(async () => {
      await expect(
        within(document.body).getByText(
          "https://app.futrob.com/roster-invitations/accept/roster-token",
        ),
      ).toBeVisible();
    });
  },
};

export const ReadOnly: Story = {
  args: {
    capabilities: {
      manageRoster: false,
      manageRoles: false,
      manageInvitations: false,
      manageExternalClub: false,
      manageEntries: false,
      unavailable: false,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Invitar" })).not.toBeInTheDocument();
    await expect(canvas.getByText("Dani Capitán")).toBeVisible();
  },
};

const rejectedWithRoster = { ...detail, entry: { ...detail.entry, status: "rejected" as const } };

/** A rejected entry's roster stays readable but has no write controls, staff included. */
export const RejectedEntryWithRoster: Story = {
  name: "Rejected entry, roster read-only",
  args: {
    items: [teamSummaryFixture(rejectedWithRoster)],
    detail: rejectedWithRoster,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Inscripción rechazada")).toBeVisible();
    await expect(canvas.queryByText("Admite invitaciones")).not.toBeInTheDocument();
    await expect(canvas.getByText("Solo lectura por inscripción rechazada")).toBeVisible();
    await expect(
      canvas.queryByRole("combobox", { name: "Rol de Dani Capitán" }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Invitar" })).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Cerrar plantilla" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("Dani Capitán")).toBeVisible();
  },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

export const EmptyTeams: Story = {
  name: "Empty teams",
  args: {
    items: [],
    detail: null,
    selectedTeamId: null,
  },
};

export const LoadingList: Story = {
  name: "Loading",
  args: {
    items: [],
    detail: null,
    selectedTeamId: null,
    loadingList: true,
    loadingDetail: true,
  },
};

export const PermissionUnavailable: Story = {
  name: "Permissions unavailable",
  args: {
    capabilities: {
      ...defaultArgs.capabilities,
      unavailable: true,
      manageRoster: false,
      manageRoles: false,
      manageInvitations: false,
      manageExternalClub: false,
      manageEntries: false,
    },
  },
};

export const RecoverableError: Story = {
  name: "Recoverable error",
  args: {
    error: {
      message: "No pudimos completar la operación. Inténtalo nuevamente.",
      requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
    },
  },
};

const rejectedDetail = {
  ...detail,
  entry: { ...detail.entry, status: "rejected" as const },
  roster: { ...detail.roster, memberCount: 0 },
  members: [],
};

export const RejectedEntry: Story = {
  name: "Rejected entry",
  args: {
    items: [teamSummaryFixture(rejectedDetail)],
    detail: rejectedDetail,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Inscripción rechazada")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Invitar" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Invitar jugador" })).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Cerrar plantilla" }),
    ).not.toBeInTheDocument();
  },
};

const longListTeams = Array.from({ length: 25 }, (_, index) => {
  const id = `team-long-${index + 1}`;
  return {
    ...detail,
    team: { ...detail.team, id, name: `Equipo ${String(index + 1).padStart(2, "0")}` },
    entry: { ...detail.entry, id: `entry-long-${index + 1}`, teamId: id },
  };
});
const lowSelection = longListTeams[19]!;

/** Desktop: selecting a low row keeps the sticky detail and its decision in view. */
export const LongListLowSelection: Story = {
  name: "Long list, low row selected",
  args: {
    items: longListTeams.map((team) => teamSummaryFixture(team)),
    detail: lowSelection,
    selectedTeamId: lowSelection.team.id,
  },
};
