import type { ClockPort } from "@futrob/shared-kernel";
import type { CompetitionStatus } from "../domain/entities/competition.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../domain/ports/competition.repository.ts";

/** Persists a status change guarded by the status the caller read. */
export async function transitionCompetitionStatus(
  deps: { readonly competitions: CompetitionRepository; readonly clock: ClockPort },
  current: CompetitionDraft,
  to: CompetitionStatus,
): Promise<CompetitionDraft | null> {
  const next: CompetitionDraft = {
    ...current,
    competition: { ...current.competition, status: to, updatedAt: deps.clock.now() },
  };
  return deps.competitions.changeStatus(next, current.competition.status);
}
