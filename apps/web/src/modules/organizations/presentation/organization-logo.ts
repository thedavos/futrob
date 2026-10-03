import type { OrganizationLogoDto } from "@futrob/api-contracts";

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ACCEPTED_TYPES: ReadonlySet<string> = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Public URL of an uploaded logo; the monogram has no image. */
export function organizationLogoUrl(logo: OrganizationLogoDto): string | null {
  return logo.kind === "upload" ? `/media/${logo.key}` : null;
}

/** Up to two initials: first letters of the first two words, or the first two letters of one word. */
export function organizationMonogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const [first, second] = words;
  if (first === undefined) return "?";
  const letters = Array.from(first);
  const initials = second === undefined ? letters.slice(0, 2) : [letters[0], Array.from(second)[0]];
  return initials.join("").toLocaleUpperCase();
}

export type LogoFileProblem = "invalidType" | "tooLarge";

/** The Worker sniffs the real type again; this only spares the user a doomed upload. */
export function logoFileProblem(file: {
  readonly type: string;
  readonly size: number;
}): LogoFileProblem | null {
  if (!ACCEPTED_TYPES.has(file.type)) return "invalidType";
  if (file.size > MAX_LOGO_BYTES) return "tooLarge";
  return null;
}
