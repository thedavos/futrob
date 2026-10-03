import type { OrganizationId } from "@futrob/shared-kernel";

/** Built-in illustrations. The web maps each id to its `trophy-*` asset. */
export const COMPETITION_COVER_PRESETS = [
  "cup",
  "classic",
  "friendlies",
  "groups",
  "league",
  "lightning",
  "playoffs",
  "pre-season",
  "supercup",
] as const;

export type CompetitionCoverPreset = (typeof COMPETITION_COVER_PRESETS)[number];

declare const mediaKeyBrand: unique symbol;

/** R2 object key owned by one organization, e.g. `competition-covers/{orgId}/{name}.png`. */
export type MediaKey = string & { readonly [mediaKeyBrand]: true };

export type CompetitionCover =
  | { readonly kind: "preset"; readonly preset: CompetitionCoverPreset }
  | { readonly kind: "upload"; readonly key: MediaKey };

export type CompetitionCoverInput =
  | { readonly kind: "preset"; readonly preset: CompetitionCoverPreset }
  | { readonly kind: "upload"; readonly key: string };

export const DEFAULT_COMPETITION_COVER: CompetitionCover = { kind: "preset", preset: "cup" };

export function competitionCoverKeyPrefix(organizationId: OrganizationId): string {
  return `competition-covers/${organizationId}/`;
}

const OBJECT_NAME = /^[A-Za-z0-9_-]{1,120}\.(png|jpg|webp)$/;

/** Accepts an uploaded key only inside the organization's cover prefix. */
export function parseCompetitionCover(
  input: CompetitionCoverInput,
  organizationId: OrganizationId,
): CompetitionCover | null {
  if (input.kind === "preset") return input;
  const prefix = competitionCoverKeyPrefix(organizationId);
  if (!input.key.startsWith(prefix)) return null;
  if (!OBJECT_NAME.test(input.key.slice(prefix.length))) return null;
  // SAFETY: the key sits under this organization's prefix with a safe object name.
  return { kind: "upload", key: input.key as MediaKey };
}
