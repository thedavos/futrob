import type { Pool } from "pg";
import { TeamExternalClubMutationLock } from "@/adapters/teams/external-club-mutation-lock.ts";
import type { OrganizationOperationAuditRepository } from "@futrob/organizations";
import type { CompetitionRosterMembership } from "@futrob/teams";
import type { ActorId, ClockPort, IdGeneratorPort, TransactionPort } from "@futrob/shared-kernel";
import { currentRequestCorrelation } from "@/context/request-correlation.ts";
import { runAtomically } from "@/application/notifications/run-atomically.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { ActivityCommands } from "./notifications.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export function createAuditCommands(
  ports: {
    readonly pool: Pool | undefined;
    readonly clock: ClockPort;
    readonly ids: IdGeneratorPort;
    readonly transaction: TransactionPort;
    readonly operations: OrganizationOperationAuditRepository;
  },
  modules: {
    readonly scheduling: SchedulingModule;
    readonly teams: TeamsModule;
    readonly activityCommands: ActivityCommands;
  },
) {
  const clubMutationLock = new TeamExternalClubMutationLock(ports.pool);
  async function recordRoster(membership: CompetitionRosterMembership, actorId: ActorId) {
    await ports.operations.append({
      id: `roster:${membership.id}`,
      organizationId: membership.organizationId,
      competitionId: membership.competitionId,
      actorId,
      action: "teams.roster_member_added",
      reason: null,
      occurredAt: membership.createdAt,
      requestId: currentRequestCorrelation()?.requestId ?? null,
      object: { type: "team", id: membership.teamId, label: null, href: null },
    });
  }
  return {
    addToRoster: {
      execute: (input: Parameters<TeamsModule["addToRoster"]["execute"]>[0]) =>
        runAtomically(ports.transaction, async () => {
          const result = await modules.teams.addToRoster.execute(input);
          if (result.isOk()) await recordRoster(result.value, input.actorId);
          return result;
        }),
    },
    acceptRosterInvitation: {
      execute: (input: Parameters<ActivityCommands["acceptRosterInvitation"]["execute"]>[0]) =>
        runAtomically(ports.transaction, async () => {
          const result = await modules.activityCommands.acceptRosterInvitation.execute(input);
          if (result.isOk()) await recordRoster(result.value, input.actorId);
          return result;
        }),
    },
    respondToRosterInvitation: {
      execute: (input: Parameters<ActivityCommands["respondToRosterInvitation"]["execute"]>[0]) =>
        runAtomically(ports.transaction, async () => {
          const result = await modules.activityCommands.respondToRosterInvitation.execute(input);
          if (result.isOk() && result.value.kind === "accepted")
            await recordRoster(result.value.membership, input.actorId);
          return result;
        }),
    },
    generateFixture: {
      execute: (input: Parameters<SchedulingModule["generateFixture"]["execute"]>[0]) =>
        runAtomically(ports.transaction, async () => {
          const result = await modules.scheduling.generateFixture.execute(input);
          if (result.isOk())
            await ports.operations.append({
              id: `fixture:${result.value.id}`,
              organizationId: input.organizationId,
              competitionId: input.competitionId,
              actorId: input.actorId,
              action: "scheduling.fixture_generated",
              reason: null,
              occurredAt: ports.clock.now(),
              requestId: input.requestId ?? currentRequestCorrelation()?.requestId ?? null,
              object: { type: "fixture", id: result.value.id, label: null, href: null },
            });
          return result;
        }),
    },
    connectTeamExternalClub: {
      execute: (input: Parameters<TeamsModule["connectTeamExternalClub"]["execute"]>[0]) =>
        runAtomically(ports.transaction, () =>
          clubMutationLock.runExclusive(input.teamId, async () => {
            const previous = await modules.teams.externalClubConnections.findByTeam(input.teamId);
            const result = await modules.teams.connectTeamExternalClub.execute(input);
            if (
              result.isOk() &&
              (previous?.providerKey !== result.value.providerKey ||
                previous.externalClubId !== result.value.externalClubId ||
                previous.externalClubName !== result.value.externalClubName ||
                previous.gameEdition !== result.value.gameEdition ||
                previous.platform !== result.value.platform)
            )
              await ports.operations.append({
                id: ports.ids.generate(),
                organizationId: input.organizationId,
                competitionId: input.competitionId ?? null,
                actorId: input.actorId,
                action: "teams.external_club_connected",
                reason: null,
                occurredAt: ports.clock.now(),
                requestId: currentRequestCorrelation()?.requestId ?? null,
                object: {
                  type: "team",
                  id: input.teamId,
                  label: input.externalClubName,
                  href: null,
                },
              });
            return result;
          }),
        ),
    },
  };
}
