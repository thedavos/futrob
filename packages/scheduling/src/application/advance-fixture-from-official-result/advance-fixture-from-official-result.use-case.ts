import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  AdvancementNotReversible,
  FixtureSourceNotFound,
  FixtureUpdateConflict,
  TieRequiresOrganizerReview,
  type AdvanceFixtureFromOfficialResultError,
} from "../../domain/errors/fixture.errors.ts";
import type { EncounterScheduleRepository } from "../../domain/ports/encounter-schedule.repository.ts";
import type { FixtureEncounterEditGuardPort } from "../../domain/ports/fixture-editing.ports.ts";
import type {
  CompetitionFixtureSourcePort,
  FixturePlanRepository,
} from "../../domain/ports/fixture-plan.repository.ts";
import type { OfficialEncounterScoreReaderPort } from "../../domain/ports/official-encounter-score-reader.port.ts";
import type { OfficialMatchRepository } from "../../domain/ports/official-match.repository.ts";
import { findEncounter } from "../../domain/policies/edit-fixture-encounter.ts";
import {
  hasAdvancementSlots,
  placeholderDependsOn,
  reconcileFixtureAdvancement,
} from "../../domain/policies/reconcile-fixture-advancement.ts";
import { projectFixtureEncounter } from "../project-fixture-encounters.ts";

export interface AdvanceFixtureFromOfficialResultInput {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  /** Encounter whose official result was approved or voided. */
  readonly encounterId: EncounterId;
}

export interface AdvanceFixtureFromOfficialResultOutput {
  readonly changedEncounterIds: readonly EncounterId[];
}

/**
 * Converges the advanced slots of the Encounter's fixture to its approved official results:
 * fills winner, group-rank and stage-rank slots, and restores the placeholder when a source
 * result is voided. Writes nothing when the Encounter's destination is tied (DEC-017) or when
 * a destination to change already has a selection or official result.
 */
export class AdvanceFixtureFromOfficialResultUseCase {
  constructor(
    private readonly deps: {
      readonly clock: ClockPort;
      readonly editGuard: FixtureEncounterEditGuardPort;
      readonly encounters: EncounterScheduleRepository;
      readonly fixtures: FixturePlanRepository;
      readonly matches: OfficialMatchRepository;
      readonly scores: OfficialEncounterScoreReaderPort;
      readonly source: CompetitionFixtureSourcePort;
    },
  ) {}

  async execute(
    input: AdvanceFixtureFromOfficialResultInput,
  ): Promise<
    Result<AdvanceFixtureFromOfficialResultOutput, AdvanceFixtureFromOfficialResultError>
  > {
    const plans = await this.deps.fixtures.listActive(input.organizationId, input.competitionId);
    const plan = plans.find((candidate) => findEncounter(candidate, input.encounterId));
    const trigger = plan ? findEncounter(plan, input.encounterId) : null;
    if (!plan || !trigger || !hasAdvancementSlots(plan)) return ok({ changedEncounterIds: [] });

    const source = await this.deps.source.load(input);
    if (!source) {
      return err(
        new FixtureSourceNotFound({
          code: "scheduling.fixture_source_not_found",
          message: "Competition rules for fixture advancement were not found",
          competitionId: input.competitionId,
        }),
      );
    }
    const advancement = reconcileFixtureAdvancement({
      plan,
      scores: await this.deps.scores.listApproved(input),
      standingPoints: source.standingPoints,
      advancedResolutionMode: source.resolutionModes.knockout,
    });

    if (advancement.ties.some((placeholder) => placeholderDependsOn(placeholder, trigger))) {
      return err(
        new TieRequiresOrganizerReview({
          code: "scheduling.tie_requires_organizer_review",
          message: "The result is tied and no tie-break data is configured",
          encounterId: input.encounterId,
        }),
      );
    }
    for (const { before } of advancement.changes) {
      if (
        before.series &&
        !(await this.deps.editGuard.canEdit({ ...input, encounterId: before.id }))
      ) {
        return err(
          new AdvancementNotReversible({
            code: "scheduling.advancement_not_reversible",
            message: "A later Encounter already has a selection or official result",
            encounterId: before.id,
          }),
        );
      }
    }

    let revision = plan.revision;
    for (const { before, after } of advancement.changes) {
      const updated = await this.deps.fixtures.updateEncounter({
        organizationId: plan.organizationId,
        competitionId: plan.competitionId,
        fixturePlanId: plan.id,
        revision,
        encounter: after,
      });
      if (!updated) {
        return err(
          new FixtureUpdateConflict({
            code: "scheduling.fixture_update_conflict",
            message: "The fixture changed concurrently",
          }),
        );
      }
      revision = updated.revision;
      if (after.series) {
        await projectFixtureEncounter(this.deps, updated, after);
      } else if (before.series) {
        await this.deps.encounters.deleteByEncounterIds([before.id]);
      }
    }
    return ok({ changedEncounterIds: advancement.changes.map(({ after }) => after.id) });
  }
}
