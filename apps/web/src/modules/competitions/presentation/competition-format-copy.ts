import type { CompetitionFormatDto } from "@futrob/api-contracts";

export type Legs = "single" | "double";

export const estimateParticipantsNotice =
  "Esta estimación cambia cuando confirmes los participantes.";

export function matchesPerEncounterLabel(matches: 1 | 2): string {
  return matches === 1 ? "1 partido" : "2 partidos";
}

export function matchesPerEncounterSummary(
  format: CompetitionFormatDto,
  regular: 1 | 2 | null,
  knockout: 1 | 2 | null,
): string {
  if (format === "league") return regular === null ? "—" : matchesPerEncounterLabel(regular);
  if (format === "knockout") return knockout === null ? "—" : matchesPerEncounterLabel(knockout);
  if (regular === null || knockout === null) return "—";
  if (regular === knockout) return matchesPerEncounterLabel(regular);
  const opening = format === "groups-knockout" ? "Grupos" : "Liga";
  const closing = format === "league-playoffs" ? "Playoffs" : "Eliminación";
  return `${opening} ${matchesPerEncounterLabel(regular)} · ${closing} ${matchesPerEncounterLabel(
    knockout,
  )}`;
}

export function encounterResolutionCaption(matches: 1 | 2): string {
  return matches === 1
    ? "Cada enfrentamiento se resuelve en un partido."
    : "Cada enfrentamiento se resuelve en 2 partidos.";
}

export function roundRobinNotice(legs: Legs, matches: 1 | 2): string {
  if (legs === "single" && matches === 1) {
    return "Cada equipo se enfrenta una vez a cada rival, en un partido.";
  }
  if (legs === "single") {
    return "Cada equipo se enfrenta una vez a cada rival. Ese enfrentamiento se juega en 2 partidos.";
  }
  if (matches === 1) {
    return "Cada equipo se enfrenta dos veces a cada rival, de local y de visitante. Cada enfrentamiento es un partido.";
  }
  return "Cada equipo se enfrenta dos veces a cada rival, de local y de visitante. Cada enfrentamiento se juega en 2 partidos.";
}

export function seriesNotice(matches: 1 | 2): string {
  return matches === 1
    ? "Cada serie se decide en un partido."
    : "Cada serie se decide en 2 partidos.";
}
