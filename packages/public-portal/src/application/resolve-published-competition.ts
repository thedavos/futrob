import { err, ok, type Result } from "@futrob/shared-kernel";
import { PublicCompetitionNotFound } from "../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../domain/public-competition-key.ts";
import {
  isPubliclyVisibleStatus,
  type PublicCompetitionStatus,
} from "../domain/policies/public-visibility.ts";
import type {
  PublicCompetitionSource,
  PublishedCompetitionReaderPort,
} from "../domain/ports/published-competition-reader.port.ts";

/** A source that already passed the publication gate. */
export type PublishedCompetitionSource = PublicCompetitionSource & {
  readonly status: PublicCompetitionStatus;
};

/**
 * The single publication gate. Every public read goes through it, so an unknown key and a
 * competition that is not published fail identically and never reach another reader.
 */
export async function resolvePublishedCompetition(
  reader: PublishedCompetitionReaderPort,
  key: PublicCompetitionKey,
): Promise<Result<PublishedCompetitionSource, PublicCompetitionNotFound>> {
  const source = await reader.findByKey(key);
  const status = source?.status;
  if (!source || status === undefined || !isPubliclyVisibleStatus(status)) {
    return err(
      new PublicCompetitionNotFound({
        code: "public_portal.competition_not_found",
        message: "Competition is not published",
      }),
    );
  }
  return ok({ ...source, status });
}
