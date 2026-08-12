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

export class GetCompetitionFixtureUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly fixtures: Pick<FixturePlanRepository, "findById">;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly fixturePlanId: string;
  }): Promise<Result<FixturePlan, FixturePlanNotFound>> {
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
    const plan = await this.deps.fixtures.findById(
      input.organizationId,
      input.competitionId,
      input.fixturePlanId,
    );
    return plan
      ? ok(plan)
      : err(
          new FixturePlanNotFound({
            code: "scheduling.fixture_plan_not_found",
            message: "Fixture plan not found",
            competitionId: input.competitionId,
          }),
        );
  }
}
