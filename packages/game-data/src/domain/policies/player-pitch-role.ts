export type PlayerPitchRole = "attack" | "midfield" | "defense" | "goalkeeper" | "unknown";

const ATTACK = new Set([
  "attacker",
  "forward",
  "striker",
  "winger",
  "st",
  "cf",
  "lf",
  "rf",
  "lw",
  "rw",
]);

const MIDFIELD = new Set(["midfielder", "cam", "cm", "lm", "rm", "cdm"]);

const DEFENSE = new Set(["defender", "cb", "lb", "rb", "lwb", "rwb", "wb", "sw"]);

const GOALKEEPER = new Set(["goalkeeper", "gk"]);

/**
 * Maps the provider position string (EA `pos`) onto a coarse pitch role used
 * for attribute scoring. Unknown / missing values stay `unknown` and do not
 * contribute to role-specific ratings.
 */
export function playerPitchRole(position: string | null): PlayerPitchRole {
  if (position === null) return "unknown";
  const key = position.trim().toLowerCase();
  if (ATTACK.has(key)) return "attack";
  if (MIDFIELD.has(key)) return "midfield";
  if (DEFENSE.has(key)) return "defense";
  if (GOALKEEPER.has(key)) return "goalkeeper";
  return "unknown";
}

export function isOffensiveRole(role: PlayerPitchRole): boolean {
  return role === "attack" || role === "midfield";
}

export function isDefensiveRole(role: PlayerPitchRole): boolean {
  return role === "defense" || role === "goalkeeper" || role === "midfield";
}
