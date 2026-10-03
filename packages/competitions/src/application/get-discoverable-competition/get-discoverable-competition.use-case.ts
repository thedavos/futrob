import { err, ok, type CompetitionId, type Result } from "@futrob/shared-kernel";
import {
  CompetitionNotDiscoverable,
  type GetDiscoverableCompetitionError,
} from "../../domain/errors/competition.errors.ts";
import type {
  CompetitionDiscoveryReader,
  DiscoverableCompetitionRecord,
} from "../../domain/ports/competition-discovery.reader.ts";

export class GetDiscoverableCompetitionUseCase {
  constructor(private readonly discovery: CompetitionDiscoveryReader) {}

  async execute(input: {
    readonly competitionId: CompetitionId;
  }): Promise<Result<DiscoverableCompetitionRecord, GetDiscoverableCompetitionError>> {
    const record = await this.discovery.findById(input.competitionId);
    if (!record) {
      return err(
        new CompetitionNotDiscoverable({
          code: "competitions.not_discoverable",
          message: "Competition is not discoverable",
        }),
      );
    }
    return ok(record);
  }
}
