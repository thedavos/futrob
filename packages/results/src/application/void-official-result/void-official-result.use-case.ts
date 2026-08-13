import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type ClockPort,
  type EventPublisherPort,
  type Result,
} from "@futrob/shared-kernel";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import {
  OfficialResultForbidden,
  OfficialResultNotFound,
  type VoidOfficialResultError,
} from "../../domain/errors/official-result.errors.ts";
import type { OfficialResultRepository } from "../../domain/ports/official-result.repository.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";

export type VoidOfficialResultInput = {
  readonly actorId: ActorId;
} & (
  | { readonly officialResultId: string }
  | { readonly encounterId: OfficialResult["encounterId"] }
);

export interface VoidOfficialResultDependencies {
  readonly results: OfficialResultRepository;
  readonly authorization: AuthorizationPort;
  readonly eventPublisher: EventPublisherPort;
  readonly clock: ClockPort;
}

export class VoidOfficialResultUseCase {
  constructor(private readonly deps: VoidOfficialResultDependencies) {}

  async execute(
    input: VoidOfficialResultInput,
  ): Promise<Result<OfficialResult, VoidOfficialResultError>> {
    const existing =
      "officialResultId" in input
        ? await this.deps.results.findById(input.officialResultId)
        : await this.deps.results.findLatestByEncounter(input.encounterId);
    if (!existing) {
      return err(
        new OfficialResultNotFound({
          code: "results.official_result_not_found",
          message: "Official result was not found",
        }),
      );
    }

    const authorization = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: RESULT_PERMISSION.resultApprove,
      scope: {
        organizationId: existing.organizationId,
        competitionId: existing.competitionId,
        encounterId: existing.encounterId,
      },
    });
    if (!authorization.allowed) {
      return err(
        new OfficialResultForbidden({
          code: "results.official_result_forbidden",
          message: "The actor cannot void this official result",
        }),
      );
    }

    // Void every approved revision for the encounter so an older approval cannot
    // remain live after the latest revision is voided and stats are cleared.
    const approved = (await this.deps.results.listByEncounter(existing.encounterId)).filter(
      (result) => result.status === "approved",
    );
    if (approved.length === 0) {
      return ok(existing);
    }

    const voided = await Promise.all(
      approved.map((result) => this.deps.results.save({ ...result, status: "voided" })),
    );
    const latestVoided = voided.reduce((latest, result) =>
      result.revision >= latest.revision ? result : latest,
    );

    await this.deps.eventPublisher.publish({
      eventName: "results.official-result-voided",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: {
        encounterId: latestVoided.encounterId,
        organizationId: latestVoided.organizationId,
        competitionId: latestVoided.competitionId,
        voidedBy: input.actorId,
        officialResultId: latestVoided.id,
        revision: latestVoided.revision,
      },
    });
    return ok(latestVoided);
  }
}
