import {
  ImposeSanctionUseCase,
  ListCompetitionSanctionsUseCase,
  ListTeamSanctionsUseCase,
  RevokeSanctionUseCase,
  SANCTION_TYPE,
} from "@futrob/competitions";
import {
  Panic,
  type AuthorizationPort,
  type ClockPort,
  type IdGeneratorPort,
  type TransactionPort,
} from "@futrob/shared-kernel";
import { TEAM_PERMISSION } from "@futrob/teams";
import { RosterAndEncounterSanctionTargetReader } from "@/adapters/competitions/sanction-target.reader.ts";
import {
  createSanctionCommands,
  SanctionActivity,
  type SanctionCommands,
  type SanctionTableEffect,
} from "@/application/notifications/sanction-activity.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { ActivityWriter } from "./notifications.module.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { StatisticsModule } from "./statistics.module.ts";
import type { TeamsModule } from "./teams.module.ts";

/** Statistics reads active deductions through this bridge (ADR-0028). */
export { SanctionPointDeductionReader } from "@/adapters/statistics/sanction-point-deduction.reader.ts";

export interface SanctionsComposition {
  /** Impose and revoke with their table rebuild and activity in one transaction. */
  readonly commands: SanctionCommands;
  readonly listByCompetition: ListCompetitionSanctionsUseCase;
  readonly listByTeam: ListTeamSanctionsUseCase;
}

/** Competition sanctions (ADR-0028): competitions + teams/scheduling targets + statistics. */
export function createSanctions(
  ports: {
    readonly authorization: AuthorizationPort;
    readonly transaction: TransactionPort;
    readonly clock: ClockPort;
    readonly ids: IdGeneratorPort;
  },
  modules: {
    readonly writer: ActivityWriter;
    readonly competitions: CompetitionsModule;
    readonly teams: TeamsModule;
    readonly scheduling: Pick<SchedulingModule, "encounters">;
    readonly statistics: Pick<StatisticsModule, "useCases">;
  },
): SanctionsComposition {
  const input = { ...ports, ...modules };
  const sanctions = input.competitions.sanctionRepository;
  const competitions = input.competitions.repository;
  const table: SanctionTableEffect = {
    async apply(sanction) {
      if (sanction.type !== SANCTION_TYPE.pointsDeduction) return;
      const rebuilt = await input.statistics.useCases.rebuildCompetitionStatistics.execute({
        organizationId: sanction.organizationId,
        competitionId: sanction.competitionId,
      });
      // Throwing rolls the sanction back with the table it could not rebuild.
      if (rebuilt.isErr()) throw new Panic(`Standings rebuild failed: ${rebuilt.error.code}`);
    },
  };
  return {
    commands: createSanctionCommands({
      transaction: input.transaction,
      table,
      activity: new SanctionActivity({
        writer: input.writer,
        readers: { competitions, teams: input.teams.repositories.teams },
      }),
      impose: new ImposeSanctionUseCase({
        authorization: input.authorization,
        competitions,
        entries: input.competitions.entryRepository,
        targets: new RosterAndEncounterSanctionTargetReader({
          rosters: input.teams.repositories.rosters,
          encounters: input.scheduling.encounters,
        }),
        sanctions,
        clock: input.clock,
        ids: input.ids,
      }),
      revoke: new RevokeSanctionUseCase({
        authorization: input.authorization,
        competitions,
        sanctions,
        clock: input.clock,
      }),
    }),
    listByCompetition: new ListCompetitionSanctionsUseCase({
      authorization: input.authorization,
      competitions,
      sanctions,
    }),
    listByTeam: new ListTeamSanctionsUseCase({
      authorization: input.authorization,
      sanctions,
      teamReadPermission: TEAM_PERMISSION.read,
    }),
  };
}
