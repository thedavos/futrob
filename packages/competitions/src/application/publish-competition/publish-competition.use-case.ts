import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import {
  CompetitionNotEditable,
  CompetitionNotFound,
  CompetitionPublishBlocked,
  InvalidCompetitionRules,
  type PublishCompetitionError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { isValidCompetitionRules } from "../competition-draft-validation.ts";

export class PublishCompetitionUseCase {
  constructor(
    private readonly deps: {
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly clock: ClockPort;
    },
  ) {}
  async execute(input: {
    organizationId: OrganizationId;
    competitionId: CompetitionId;
  }): Promise<Result<CompetitionDraft, PublishCompetitionError>> {
    const draft = await this.deps.competitions.findById(input.organizationId, input.competitionId);
    if (!draft)
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    if (draft.competition.status !== "draft")
      return err(
        new CompetitionNotEditable({
          code: "competitions.not_editable",
          message: "Competition is not editable",
        }),
      );
    if (!isValidCompetitionRules(draft.competition.format, draft.rules))
      return err(
        new InvalidCompetitionRules({
          code: "competitions.invalid_rules",
          message: "Competition rules are invalid",
        }),
      );
    const participants =
      (await this.deps.entries.listByCompetition?.(input.organizationId, input.competitionId)) ??
      [];
    if (participants.filter((entry) => entry.status === "approved").length < 2)
      return err(
        new CompetitionPublishBlocked({
          code: "competitions.publish_blocked",
          message: "At least two approved participants are required",
        }),
      );
    const published = {
      ...draft,
      competition: {
        ...draft.competition,
        status: "published" as const,
        updatedAt: this.deps.clock.now(),
      },
    };
    return ok(
      await (this.deps.competitions.publish?.(published) ??
        this.deps.competitions.saveDraft(published)),
    );
  }
}
