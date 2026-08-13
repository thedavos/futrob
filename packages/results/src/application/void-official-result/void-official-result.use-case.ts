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

    switch (existing.status) {
      case "voided":
        return ok(existing);
      case "approved":
        break;
      default:
        assertNever(existing.status);
    }

    const voided: OfficialResult = { ...existing, status: "voided" };
    const saved = await this.deps.results.save(voided);
    await this.deps.eventPublisher.publish({
      eventName: "results.official-result-voided",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: {
        encounterId: saved.encounterId,
        organizationId: saved.organizationId,
        competitionId: saved.competitionId,
        voidedBy: input.actorId,
        officialResultId: saved.id,
        revision: saved.revision,
      },
    });
    return ok(saved);
  }
}

function assertNever(status: never): never {
  throw new RangeError(`Unsupported official result status: ${String(status)}`);
}
