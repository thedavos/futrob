/** What is known about the organization's own time zone (DEC-084). */
export type OrganizationTimeZoneState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly timeZone: string };

export interface CompetitionTimeZoneResolution {
  /** The zone to show and submit; empty while it cannot be known yet. */
  readonly timeZone: string;
  /** Why the form must not be submitted yet, if it must not. */
  readonly blocked: "loading" | "error" | null;
}

/**
 * A new competition starts from its organization's time zone. Until the organizer picks a zone
 * explicitly, nothing else may stand in for it, not even the browser zone: if the organization's
 * zone cannot be read, the form waits instead of creating a competition with the wrong one.
 */
export function resolveCompetitionTimeZone(input: {
  readonly edited: boolean;
  readonly editedTimeZone: string;
  readonly organization: OrganizationTimeZoneState;
}): CompetitionTimeZoneResolution {
  if (input.edited) return { timeZone: input.editedTimeZone, blocked: null };
  switch (input.organization.status) {
    case "ready":
      return { timeZone: input.organization.timeZone, blocked: null };
    case "loading":
      return { timeZone: "", blocked: "loading" };
    case "error":
      return { timeZone: "", blocked: "error" };
    default: {
      const _exhaustive: never = input.organization;
      return _exhaustive;
    }
  }
}
