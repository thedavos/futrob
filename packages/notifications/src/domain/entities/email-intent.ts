import type { ActivityOutcome } from "./activity-entry.ts";

export const EMAIL_LOCALES = ["es", "en"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "es";

/** FTR-NTF-001: the facts Futrob notifies by email. */
export const EMAIL_TEMPLATE = {
  registration: "registration",
  upcomingMatch: "upcoming_match",
  reschedule: "reschedule",
  eaCandidates: "ea_candidates",
  proposedSelection: "proposed_selection",
  resultOrDispute: "result_or_dispute",
  organizerDecision: "organizer_decision",
  sanction: "sanction",
} as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATE)[keyof typeof EMAIL_TEMPLATE];

/**
 * Critical email asks the recipient to act on competitive work or tells them about a
 * decision against them. It ignores the opt-out and carries no unsubscribe link.
 */
export const CRITICAL_EMAIL_TEMPLATES: ReadonlySet<EmailTemplate> = new Set([
  EMAIL_TEMPLATE.reschedule,
  EMAIL_TEMPLATE.proposedSelection,
  EMAIL_TEMPLATE.resultOrDispute,
  EMAIL_TEMPLATE.organizerDecision,
  EMAIL_TEMPLATE.sanction,
]);

export function isCriticalEmail(template: EmailTemplate): boolean {
  return CRITICAL_EMAIL_TEMPLATES.has(template);
}

/** Display names snapshotted when the fact happened; never free-text reasons. */
export interface EmailNames {
  readonly competitionName: string | null;
  readonly encounterLabel: string | null;
  readonly teamName: string | null;
}

interface EmailIntentBase extends EmailNames {
  /** Web path the call to action opens, relative to the web origin. */
  readonly path: string;
}

/** What an email says, by template. Copy and layout come from the template catalog. */
export type EmailIntent = EmailIntentBase &
  (
    | { readonly template: "registration"; readonly requiresAction: boolean }
    | { readonly template: "upcoming_match"; readonly startsAt: string }
    | { readonly template: "reschedule"; readonly requiresAction: boolean }
    | { readonly template: "ea_candidates"; readonly candidateCount: number }
    | { readonly template: "proposed_selection"; readonly requiresAction: boolean }
    | { readonly template: "result_or_dispute"; readonly result: "official" | "disputed" }
    | { readonly template: "organizer_decision"; readonly outcome: ActivityOutcome | null }
    | { readonly template: "sanction" }
  );
