import { err, ok, type Result } from "@futrob/shared-kernel";
import type { PublicTeams } from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type { PublicTeamDirectoryPort } from "../../domain/ports/public-team-directory.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";

export interface GetPublicTeamsDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly teams: PublicTeamDirectoryPort;
}

const collator = new Intl.Collator("es", { sensitivity: "base" });

export class GetPublicTeamsUseCase {
  constructor(private readonly deps: GetPublicTeamsDependencies) {}

  /** Approved participants of a published competition, by name only. */
  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicTeams, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const names = await this.deps.teams.listParticipantNames(resolved.value.scope);
    return ok({
      teams: [...names].sort((a, b) => collator.compare(a, b)).map((name) => ({ name })),
    });
  }
}
