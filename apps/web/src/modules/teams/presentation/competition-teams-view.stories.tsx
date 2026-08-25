import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "@futrob/ui";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { CompetitionTeamsView, type CompetitionTeamsViewProps } from "./competition-teams-view.tsx";
import { teamManagementFixture, teamSummaryFixture } from "./competition-teams-view.fixtures.ts";

const styles = stylex.create({
  frame: {
    display: "flex",
    height: "100svh",
    flexDirection: "column",
  },
});

const noOp = async () => undefined;
const detail = teamManagementFixture();
const defaultArgs: CompetitionTeamsViewProps = {
  items: [teamSummaryFixture(detail)],
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
      <div {...applyStyles(styles.frame)}>
        <Story />
      </div>
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
    await expect(within(canvasElement).getByText("Sin jugadores.")).toBeVisible();
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
