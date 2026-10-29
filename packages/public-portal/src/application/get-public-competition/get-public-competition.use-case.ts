import { err, ok, type Result } from "@futrob/shared-kernel";
import type { PublicCompetition } from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import {
  resolvePublishedCompetition,
  type PublishedCompetitionSource,
} from "../resolve-published-competition.ts";

export class GetPublicCompetitionUseCase {
  constructor(private readonly competitions: PublishedCompetitionReaderPort) {}

  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicCompetition, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    return ok(toPublicCompetition(resolved.value));
  }
}

/** Field-by-field allowlist: no spread, so new source fields stay private by default. */
export function toPublicCompetition(source: PublishedCompetitionSource): PublicCompetition {
  return {
    name: source.name,
    status: source.status,
    format: source.format,
    platform: source.platform,
    gameEdition: source.gameEdition,
    region: source.region,
    timeZone: source.timeZone,
    startsOn: source.startsOn,
    endsOn: source.endsOn,
    approvedTeamCount: source.approvedTeamCount,
    coverPreset: source.cover.kind === "preset" ? source.cover.preset : null,
  };
}
