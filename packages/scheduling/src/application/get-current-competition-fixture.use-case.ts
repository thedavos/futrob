import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import { FixturePlanNotFound } from "../domain/errors/fixture.errors.ts";
import type { FixturePlanRepository } from "../domain/ports/fixture-plan.repository.ts";
import { ENCOUNTER_PERMISSION } from "../domain/policies/encounter-permissions.ts";

/**
 * The competition's current fixture: its active plan, or null before one is generated.
 * Generation supersedes every earlier plan, so the latest generation version wins if
 * two are ever active at once.
 */
export class GetCurrentCompetitionFixtureUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly fixtures: Pick<FixturePlanRepository, "listActive">;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<Result<FixturePlan | null, FixturePlanNotFound>> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: ENCOUNTER_PERMISSION.read,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (!decision.allowed) {
      return err(
        new FixturePlanNotFound({
          code: "scheduling.fixture_plan_not_found",
          message: "Fixture plan not found",
          competitionId: input.competitionId,
        }),
      );
    }
    const plans = await this.deps.fixtures.listActive(input.organizationId, input.competitionId);
    return ok(
      plans.reduce<FixturePlan | null>(
        (current, plan) =>
          current && current.generationVersion >= plan.generationVersion ? current : plan,
        null,
      ),
    );
  }
}
