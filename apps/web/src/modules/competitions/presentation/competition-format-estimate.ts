import type { CompetitionFormatDto } from "@futrob/api-contracts";
import type { Legs } from "./competition-format-copy.ts";

export type FormatEstimate = {
  readonly rounds: number;
  readonly encounters: number;
};

/** Round-robin rounds and pairings. An odd field gives one bye each round. */
function roundRobin(teams: number, cycles: number): FormatEstimate {
  const encounters = (teams * (teams - 1)) / 2;
  const rounds = teams % 2 === 0 ? teams - 1 : teams;
  return { rounds: rounds * cycles, encounters: encounters * cycles };
}

/** Single-elimination series. One series removes one team, so n teams need n − 1 series. */
function knockout(teams: number): FormatEstimate {
  const rounds = Math.ceil(Math.log2(teams));
  return { rounds, encounters: teams - 1 };
}

function groupsAndKnockout(teams: number, cycles: number): FormatEstimate {
  const groups = Math.max(1, Math.floor(teams / 4));
  const base = Math.floor(teams / groups);
  const extra = teams % groups;
  let encounters = 0;
  let rounds = 0;
  for (let index = 0; index < groups; index += 1) {
    const size = base + (index < extra ? 1 : 0);
    if (size < 2) continue;
    const stage = roundRobin(size, cycles);
    encounters += stage.encounters;
    rounds = Math.max(rounds, stage.rounds);
  }
  const advancers = groups * Math.min(2, base);
  const final = advancers >= 2 ? knockout(advancers) : { rounds: 0, encounters: 0 };
  return { rounds: rounds + final.rounds, encounters: encounters + final.encounters };
}

function leagueThenPlayoffs(teams: number, cycles: number): FormatEstimate {
  const league = roundRobin(teams, cycles);
  const playoffTeams = teams < 4 ? 2 : 2 ** Math.floor(Math.log2(teams / 2));
  const final = knockout(playoffTeams);
  return { rounds: league.rounds + final.rounds, encounters: league.encounters + final.encounters };
}

export function estimateFixtureCounts(
  format: CompetitionFormatDto,
  teams: number,
  legs: Legs,
): FormatEstimate | null {
  if (!Number.isInteger(teams) || teams < 2) return null;
  const cycles = legs === "double" ? 2 : 1;
  switch (format) {
    case "league":
      return roundRobin(teams, cycles);
    case "knockout":
      return knockout(teams);
    case "groups-knockout":
      return groupsAndKnockout(teams, cycles);
    case "league-playoffs":
      return leagueThenPlayoffs(teams, cycles);
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

export function parseExpectedTeams(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const teams = Number(value.trim());
  return teams >= 2 ? teams : null;
}
