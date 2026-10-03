declare const organizationSlugBrand: unique symbol;

/** Public, unique, URL-safe identifier of an organization, e.g. `liga-norte`. */
export type OrganizationSlug = string & { readonly [organizationSlugBrand]: true };

export const ORGANIZATION_SLUG_MIN_LENGTH = 3;
export const ORGANIZATION_SLUG_MAX_LENGTH = 48;

/** Words that would shadow an app route or brand name once slugs map to public URLs. */
export const RESERVED_ORGANIZATION_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "explore",
  "futrob",
  "invitations",
  "login",
  "logout",
  "media",
  "new",
  "onboarding",
  "orgs",
  "player",
  "settings",
  "signup",
  "support",
]);

const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Accepts a slug only in its final form; it never rewrites the input. */
export function parseOrganizationSlug(input: string): OrganizationSlug | null {
  const value = input.trim();
  if (value.length < ORGANIZATION_SLUG_MIN_LENGTH) return null;
  if (value.length > ORGANIZATION_SLUG_MAX_LENGTH) return null;
  if (!SLUG_FORMAT.test(value)) return null;
  if (RESERVED_ORGANIZATION_SLUGS.has(value)) return null;
  // SAFETY: the value matches the slug format, length bounds and is not reserved.
  return value as OrganizationSlug;
}

const FALLBACK_SLUG_BASE = "org";

/** Derives a slug base from free text: no diacritics, lowercase, words joined by `-`. */
export function slugifyOrganizationText(text: string): string {
  const base = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, ORGANIZATION_SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return base.length >= ORGANIZATION_SLUG_MIN_LENGTH ? base : FALLBACK_SLUG_BASE;
}

/**
 * Candidate slugs for `text`, best first: the plain base, then `base-2`, `base-3`…
 * Every candidate is a valid slug; a reserved base is skipped.
 */
export function* organizationSlugCandidates(text: string): Generator<OrganizationSlug> {
  const base = slugifyOrganizationText(text);
  for (let attempt = 1; ; attempt += 1) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const trimmedBase = base.slice(0, ORGANIZATION_SLUG_MAX_LENGTH - suffix.length);
    const candidate = parseOrganizationSlug(`${trimmedBase.replace(/-+$/g, "")}${suffix}`);
    if (candidate) yield candidate;
  }
}
