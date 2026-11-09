import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { FixturePlan } from "../../domain/entities/fixture-plan.ts";
import {
  FixtureAuthorizationForbidden,
  FixturePlanNotFound,
  InvalidFixtureConfiguration,
  NotSwissFixture,
} from "../../domain/errors/fixture.errors.ts";
import type { FixturePlanRepository } from "../../domain/ports/fixture-plan.repository.ts";
import type {
  SwissRoundAction,
  SwissRoundActionLogPort,
} from "../../domain/ports/swiss-round-action-log.port.ts";
import { ENCOUNTER_PERMISSION } from "../../domain/policies/encounter-permissions.ts";

export interface SwissCommandInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly fixturePlanId: string;
  readonly reason: string;
  readonly requestId: string;
  /** Encounter locks the composition took for this command. */
  readonly heldEncounterIds?: readonly EncounterId[];
}

export type SwissCommandStart =
  | { readonly kind: "replay"; readonly plan: FixturePlan }
  | { readonly kind: "run"; readonly plan: FixturePlan; readonly reason: string };

/** Everything both organizer commands check before they may change the plan. */
export async function startSwissCommand(
  deps: {
    readonly authorization: AuthorizationPort;
    readonly fixtures: FixturePlanRepository;
    readonly actions: SwissRoundActionLogPort;
  },
  input: SwissCommandInput,
  isSameCommand: (prior: SwissRoundAction) => boolean,
): Promise<
  Result<
    SwissCommandStart,
    | FixtureAuthorizationForbidden
    | FixturePlanNotFound
    | InvalidFixtureConfiguration
    | NotSwissFixture
  >
> {
  const decision = await deps.authorization.decide({
    actorId: input.actorId,
    permission: ENCOUNTER_PERMISSION.scheduleManage,
    scope: { organizationId: input.organizationId, competitionId: input.competitionId },
  });
  if (!decision.allowed) {
    return err(
      new FixtureAuthorizationForbidden({
        code: "authorization.forbidden",
        message: "Cannot manage this Swiss fixture",
        permission: ENCOUNTER_PERMISSION.scheduleManage,
      }),
    );
  }
  const reason = input.reason.trim();
  if (!reason || !input.requestId.trim()) {
    return err(invalidSwissCommand("The command requires a reason and a request ID"));
  }
  const plan = await deps.fixtures.findById(
    input.organizationId,
    input.competitionId,
    input.fixturePlanId,
  );
  if (!plan || plan.status !== "active") {
    return err(
      new FixturePlanNotFound({
        code: "scheduling.fixture_plan_not_found",
        message: "Fixture plan not found",
        competitionId: input.competitionId,
      }),
    );
  }
  if (plan.format !== "swiss") {
    return err(
      new NotSwissFixture({
        code: "scheduling.not_swiss_fixture",
        message: "This command only applies to a Swiss fixture",
        fixturePlanId: plan.id,
      }),
    );
  }
  const prior = await deps.actions.findByRequestId(
    input.organizationId,
    input.competitionId,
    input.requestId,
  );
  if (prior) {
    return prior.fixturePlanId === plan.id && isSameCommand(prior)
      ? ok({ kind: "replay", plan })
      : err(invalidSwissCommand("requestId was already used for a different Swiss command"));
  }
  return ok({ kind: "run", plan, reason });
}

export function invalidSwissCommand(message: string): InvalidFixtureConfiguration {
  return new InvalidFixtureConfiguration({
    code: "scheduling.invalid_fixture_configuration",
    message,
  });
}
