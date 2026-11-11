import { err, ok, type ClockPort, type Result, type TeamId } from "@futrob/shared-kernel";
import type {
  PublicBracket,
  PublicBracketEncounter,
  PublicBracketEncounterStatus,
  PublicBracketSide,
} from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type {
  PublicBracketReaderPort,
  PublicBracketSourceEncounter,
  PublicBracketSourceSide,
} from "../../domain/ports/public-bracket-reader.port.ts";
import type { PublicTeamDirectoryPort } from "../../domain/ports/public-team-directory.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";
import { toPublicScore } from "../public-score.ts";

export interface GetPublicBracketDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly bracket: PublicBracketReaderPort;
  readonly teams: PublicTeamDirectoryPort;
  readonly clock: ClockPort;
}

export class GetPublicBracketUseCase {
  constructor(private readonly deps: GetPublicBracketDependencies) {}

  /**
   * The elimination stages of a published competition, rounds and encounters in play order.
   * Null when there is no fixture yet or the format has no elimination stage.
   */
  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicBracket | null, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const { scope } = resolved.value;

    const source = await this.deps.bracket.read(scope);
    if (!source || source.stages.length === 0) return ok(null);

    const encounters = source.stages.flatMap((stage) =>
      stage.rounds.flatMap((round) => round.encounters),
    );
    const names = await this.deps.teams.namesByIds(
      scope,
      encounters.flatMap((encounter) => [encounter.home, encounter.away].flatMap(teamIdOf)),
    );
    const now = this.deps.clock.now();
    const side = (value: PublicBracketSourceSide): PublicBracketSide => toPublicSide(value, names);

    return ok({
      timeZone: source.timeZone,
      stages: source.stages.map((stage) => ({
        kind: stage.kind,
        rounds: [...stage.rounds]
          .sort((a, b) => a.number - b.number)
          .map((round) => ({
            number: round.number,
            scheduledStartAt: round.scheduledStartAt,
            encounters: [...round.encounters]
              .sort((a, b) => a.order - b.order)
              .map((encounter): PublicBracketEncounter => ({
                order: encounter.order,
                scheduledStartAt: encounter.scheduledStartAt,
                officialMatchCount: encounter.officialMatchCount,
                home: side(encounter.home),
                away: side(encounter.away),
                status: statusOf(encounter, now),
                score: encounter.officialScore ? toPublicScore(encounter.officialScore) : null,
              })),
          })),
      })),
    });
  }
}

function teamIdOf(side: PublicBracketSourceSide): TeamId[] {
  return side.kind === "team" ? [side.teamId] : [];
}

function statusOf(
  encounter: PublicBracketSourceEncounter,
  now: Date,
): PublicBracketEncounterStatus {
  if (encounter.officialScore) return "official";
  if (encounter.closedWithoutResult) return "closed";
  return encounter.scheduledStartAt.getTime() <= now.getTime() ? "awaiting_result" : "scheduled";
}

function toPublicSide(
  side: PublicBracketSourceSide,
  names: ReadonlyMap<TeamId, string>,
): PublicBracketSide {
  switch (side.kind) {
    case "team": {
      const name = names.get(side.teamId);
      return name === undefined ? { kind: "pending" } : { kind: "team", name };
    }
    case "bye":
      return { kind: "bye" };
    case "winner":
      return side.from
        ? { kind: "winner", roundNumber: side.from.roundNumber, order: side.from.order }
        : { kind: "pending" };
    case "group_rank": {
      const group = groupLabel(side.groupId);
      return group === null ? { kind: "pending" } : { kind: "group_rank", group, rank: side.rank };
    }
    case "stage_rank":
      return { kind: "stage_rank", rank: side.rank };
    default: {
      const exhaustive: never = side;
      return exhaustive;
    }
  }
}

/**
 * The fixture generator names groups `group-1`, `group-2`…; spectators know them as A, B…
 * Any other id is internal and is not shown.
 */
function groupLabel(groupId: string): string | null {
  const index = /^group-(\d+)$/.exec(groupId)?.[1];
  const number = index ? Number(index) : Number.NaN;
  return number >= 1 && number <= 26 ? String.fromCodePoint(64 + number) : null;
}
