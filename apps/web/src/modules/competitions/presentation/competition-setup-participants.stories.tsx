import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import type { CompetitionEntryDto, SentEntryInvitationDto, TeamDto } from "@futrob/api-contracts";
import { ParticipantsStep } from "./competition-setup-participants.tsx";
import { SentEntryInvitations } from "./entry-invitations/sent-entry-invitations.tsx";

const NOW = new Date("2026-10-13T12:00:00.000Z");

const teams: readonly TeamDto[] = [
  { id: "team-1", organizationId: "org-1", name: "Cóndor FC", createdAt: NOW.toISOString() },
  { id: "team-2", organizationId: "org-1", name: "Halcones", createdAt: NOW.toISOString() },
];

const participants: readonly CompetitionEntryDto[] = [
  {
    id: "entry-1",
    organizationId: "org-1",
    competitionId: "cmp-1",
    teamId: "team-1",
    status: "approved",
    createdAt: NOW.toISOString(),
  },
  {
    id: "entry-2",
    organizationId: "org-1",
    competitionId: "cmp-1",
    teamId: "team-2",
    status: "pending",
    createdAt: NOW.toISOString(),
  },
];

function sent(
  id: string,
  label: string,
  overrides: Partial<SentEntryInvitationDto> = {},
): SentEntryInvitationDto {
  return {
    id,
    inviteeActorId: `act-${id}`,
    inviteeLabel: label,
    message: null,
    status: "pending",
    createdAt: "2026-10-12T12:00:00.000Z",
    expiresAt: "2026-10-26T12:00:00.000Z",
    respondedAt: null,
    acceptedEntryId: null,
    ...overrides,
  };
}

const sentInvitations: readonly SentEntryInvitationDto[] = [
  sent("inv-1", "ricardo_9", { message: "¡Te esperamos!" }),
  sent("inv-2", "condor10", { status: "accepted", acceptedEntryId: "entry-1" }),
  sent("inv-3", "lobo_99", { status: "declined" }),
  sent("inv-4", "tarde", { expiresAt: "2026-10-01T12:00:00.000Z" }),
];

type StoryArgs = {
  readonly scenario: "empty" | "withInvitations";
  readonly invite: "available" | "locked" | "none";
  readonly onOpenInvite: () => void;
  readonly onRevoke: (invitationId: string) => void;
};

function ParticipantsStory({ scenario, invite, onOpenInvite, onRevoke }: StoryArgs) {
  const withInvitations = scenario === "withInvitations";
  return (
    <ParticipantsStep
      capacity={{ min: 4, max: 8 }}
      clubs={{ "team-1": "Cóndor FC Club" }}
      clubsPending={false}
      disabled={false}
      gameEdition="FC 26"
      invite={
        invite === "none"
          ? null
          : {
              onOpen: onOpenInvite,
              disabledReason:
                invite === "locked" ? "La competición ya no admite equipos nuevos." : null,
            }
      }
      onRemove={async () => {}}
      participants={withInvitations ? participants : []}
      platformLabel="Nintendo Switch 2"
      sentInvitations={
        withInvitations ? (
          <SentEntryInvitations
            disabled={false}
            invitations={sentInvitations}
            now={NOW}
            onRevoke={onRevoke}
          />
        ) : null
      }
      teams={teams}
    />
  );
}

const meta = {
  title: "Product/Competitions/Setup/Participants",
  component: ParticipantsStory,
  parameters: { layout: "padded" },
  args: {
    scenario: "empty",
    invite: "available",
    onOpenInvite: fn(),
    onRevoke: fn(),
  },
  argTypes: {
    scenario: { control: "inline-radio", options: ["empty", "withInvitations"] },
    invite: { control: "inline-radio", options: ["available", "locked", "none"] },
  },
} satisfies Meta<typeof ParticipantsStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const EmptyWithInvite: Story = {
  name: "Vacío con invitar",
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Invita equipos de Futrob o comparte un enlace/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Invitar equipo" }));
    await expect(args.onOpenInvite).toHaveBeenCalledTimes(1);
  },
};

export const WithSentInvitations: Story = {
  name: "Con invitaciones enviadas",
  args: { scenario: "withInvitations" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const sentList = canvas.getByRole("region", { name: "Invitaciones enviadas" });
    await expect(within(sentList).getByText("1 pendiente de respuesta")).toBeVisible();
    await expect(within(sentList).getByText("Caducada")).toBeVisible();
    await expect(within(sentList).getAllByRole("button", { name: /Revocar/ })).toHaveLength(1);
    await userEvent.click(
      within(sentList).getByRole("button", { name: "Revocar invitación de ricardo_9" }),
    );
    await expect(args.onRevoke).toHaveBeenCalledWith("inv-1");
    await expect(canvas.getAllByRole("button", { name: "Invitar equipo" })).toHaveLength(1);
  },
};

export const Locked: Story = {
  name: "Competición cerrada",
  args: { invite: "locked" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Invitar equipo" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAccessibleDescription("La competición ya no admite equipos nuevos.");
  },
};

export const WithoutPermission: Story = {
  name: "Sin permiso para invitar",
  args: { invite: "none" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("button", { name: "Invitar equipo" })).toBeNull();
    await expect(
      canvas.getByText("Aparecerán aquí cuando alguien se postule con las inscripciones abiertas."),
    ).toBeVisible();
  },
};
