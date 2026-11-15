import type { ActorId, AuthorizationPort, ClockPort, TeamId } from "@futrob/shared-kernel";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { ScheduleChangeRequestEditGuardPort } from "../domain/ports/fixture-editing.ports.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";
import type {
  ScheduleChangeActorAuthority,
  ScheduleChangeFacts,
} from "../domain/policies/schedule-change-capabilities.ts";
import {
  sameRescheduleScope,
  type RescheduleScope,
} from "../domain/value-objects/reschedule-scope.ts";

export interface ScheduleChangeCapabilityDeps {
  readonly authorization: AuthorizationPort;
  readonly clock: ClockPort;
  readonly editGuard: ScheduleChangeRequestEditGuardPort;
  readonly rules: Pick<CompetitionRescheduleRulesPort, "getRules">;
}

/** Reads, once per Encounter, the same permissions the negotiation commands check. */
export async function readScheduleChangeAuthority(
  authorization: AuthorizationPort,
  actorId: ActorId,
  encounter: EncounterScheduleSnapshot,
): Promise<ScheduleChangeActorAuthority> {
  const scope = {
    organizationId: encounter.organizationId,
    competitionId: encounter.competitionId,
    encounterId: encounter.encounterId,
  };
  const requestFor = (teamId: TeamId) =>
    authorization.decide({
      actorId,
      permission: ENCOUNTER_PERMISSION.rescheduleRequest,
      scope: { ...scope, teamId },
    });
  const [home, away, organizer] = await Promise.all([
    requestFor(encounter.homeTeamId),
    requestFor(encounter.awayTeamId),
    authorization.decide({ actorId, permission: ENCOUNTER_PERMISSION.rescheduleResolve, scope }),
  ]);
  return {
    actorId,
    teamIds: [
      ...(home.allowed ? [encounter.homeTeamId] : []),
      ...(away.allowed ? [encounter.awayTeamId] : []),
    ],
    organizer: organizer.allowed,
  };
}

/** Reads the stage rules and asks the edit guard about each distinct scope once. */
export async function readScheduleChangeFacts(
  deps: ScheduleChangeCapabilityDeps,
  encounter: EncounterScheduleSnapshot,
  scopes: readonly RescheduleScope[],
): Promise<ScheduleChangeFacts> {
  const distinct = scopes.filter(
    (scope, index) => scopes.findIndex((other) => sameRescheduleScope(other, scope)) === index,
  );
  const [rules, editable] = await Promise.all([
    deps.rules.getRules({
      organizationId: encounter.organizationId,
      competitionId: encounter.competitionId,
      stageId: encounter.stageId,
    }),
    Promise.all(
      distinct.map((scope) =>
        deps.editGuard.canRequestScheduleChange({
          organizationId: encounter.organizationId,
          competitionId: encounter.competitionId,
          encounterId: encounter.encounterId,
          scope,
        }),
      ),
    ),
  ]);
  return {
    now: deps.clock.now(),
    rules,
    editableScopes: distinct.filter((_, index) => editable[index]),
  };
}
