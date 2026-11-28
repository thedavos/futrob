import type { ComponentProps } from "react";
import {
  BroadcastIcon,
  BuildingsIcon,
  CalendarDotsIcon,
  CheckCircleIcon,
  InfoIcon,
  ScalesIcon,
  ShieldIcon,
  SoccerBallIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { Badge, Icon } from "@futrob/ui";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export type AuditBadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export type AuditActionCategory =
  | "results"
  | "sanctions"
  | "competition"
  | "scheduling"
  | "teams"
  | "permissions"
  | "organization";

type AuditActionMeta = {
  readonly labelKey: ParameterlessMessageKey;
  readonly category: AuditActionCategory;
  readonly variant: AuditBadgeVariant;
  readonly icon?: Icon;
};

/**
 * Semantic mapping of every known audit action.
 * Per design.md: `approved` is reserved exclusively for official approved results.
 */
const ACTION_CATALOG = {
  "results.approved": {
    labelKey: "audit.action.resultApproved",
    category: "results",
    variant: "approved",
    icon: CheckCircleIcon,
  },
  "results.dispute_resolved_approved": {
    labelKey: "audit.action.disputeResolved",
    category: "results",
    variant: "approved",
    icon: CheckCircleIcon,
  },
  "results.dispute_opened": {
    labelKey: "audit.action.disputeOpened",
    category: "results",
    variant: "destructive",
    icon: ScalesIcon,
  },
  "results.voided": {
    labelKey: "audit.action.resultVoided",
    category: "results",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "results.rejected": {
    labelKey: "audit.action.selectionRejected",
    category: "results",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "results.reference_reuse_rejected": {
    labelKey: "audit.action.referenceReuseRejected",
    category: "results",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "results.integrity_review_required": {
    labelKey: "audit.action.integrityReviewRequired",
    category: "results",
    variant: "warning",
    icon: WarningIcon,
  },
  "results.legacy_review_required": {
    labelKey: "audit.action.legacyReviewRequired",
    category: "results",
    variant: "warning",
    icon: WarningIcon,
  },
  "results.review_started": {
    labelKey: "audit.action.reviewStarted",
    category: "results",
    variant: "warning",
    icon: ScalesIcon,
  },
  "results.returned_to_selection": {
    labelKey: "audit.action.returnedToSelection",
    category: "results",
    variant: "warning",
    icon: WarningIcon,
  },
  "results.confirmation_expired": {
    labelKey: "audit.action.confirmationExpired",
    category: "results",
    variant: "warning",
    icon: WarningIcon,
  },
  "results.proposed": {
    labelKey: "audit.action.selectionProposed",
    category: "results",
    variant: "neutral",
  },
  "results.confirmed": {
    labelKey: "audit.action.selectionConfirmed",
    category: "results",
    variant: "neutral",
  },
  "results.alternative_proposed": {
    labelKey: "audit.action.alternativeProposed",
    category: "results",
    variant: "neutral",
  },
  "sanctions.imposed": {
    labelKey: "audit.action.sanctionImposed",
    category: "sanctions",
    variant: "warning",
    icon: WarningIcon,
  },
  "sanctions.revoked": {
    labelKey: "audit.action.sanctionRevoked",
    category: "sanctions",
    variant: "warning",
    icon: WarningIcon,
  },
  "competitions.created": {
    labelKey: "audit.action.competitionCreated",
    category: "competition",
    variant: "neutral",
  },
  "competitions.published": {
    labelKey: "audit.action.competitionPublished",
    category: "competition",
    variant: "neutral",
  },
  "competitions.entry_registered": {
    labelKey: "audit.action.entryRegistered",
    category: "competition",
    variant: "neutral",
  },
  "competitions.entry_approved": {
    labelKey: "audit.action.entryApproved",
    category: "competition",
    variant: "neutral",
  },
  "competitions.entry_rejected": {
    labelKey: "audit.action.entryRejected",
    category: "competition",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "scheduling.fixture_generated": {
    labelKey: "audit.action.fixtureGenerated",
    category: "scheduling",
    variant: "info",
    icon: CalendarDotsIcon,
  },
  "scheduling.encounter_edited": {
    labelKey: "audit.action.encounterEdited",
    category: "scheduling",
    variant: "info",
    icon: CalendarDotsIcon,
  },
  "scheduling.round_closed": {
    labelKey: "audit.action.roundClosed",
    category: "scheduling",
    variant: "info",
    icon: CalendarDotsIcon,
  },
  "scheduling.team_withdrawn": {
    labelKey: "audit.action.teamWithdrawn",
    category: "scheduling",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "teams.created": {
    labelKey: "audit.action.teamCreated",
    category: "teams",
    variant: "neutral",
  },
  "teams.external_club_connected": {
    labelKey: "audit.action.clubConnected",
    category: "teams",
    variant: "neutral",
  },
  "teams.roster_member_added": {
    labelKey: "audit.action.rosterMemberAdded",
    category: "teams",
    variant: "neutral",
  },
  "organizations.created": {
    labelKey: "audit.action.organizationCreated",
    category: "organization",
    variant: "neutral",
  },
  "authorization.organization-role.changed": {
    labelKey: "audit.action.organizationRoleChanged",
    category: "organization",
    variant: "neutral",
  },
  "authorization.grant.created": {
    labelKey: "audit.action.permissionGranted",
    category: "permissions",
    variant: "neutral",
  },
  "authorization.grant.updated": {
    labelKey: "audit.action.permissionChanged",
    category: "permissions",
    variant: "neutral",
  },
  "authorization.grant.deleted": {
    labelKey: "audit.action.permissionRevoked",
    category: "permissions",
    variant: "destructive",
    icon: WarningCircleIcon,
  },
  "authorization.superuser.assigned": {
    labelKey: "audit.action.superuserAssigned",
    category: "organization",
    variant: "warning",
    icon: ShieldIcon,
  },
  "authorization.superuser.revoked": {
    labelKey: "audit.action.superuserRevoked",
    category: "organization",
    variant: "destructive",
    icon: ShieldIcon,
  },
  "billing.plan_changed": {
    labelKey: "audit.action.planChanged",
    category: "organization",
    variant: "neutral",
  },
  "game_data.sync_queued": {
    labelKey: "audit.action.syncQueued",
    category: "organization",
    variant: "info",
    icon: BroadcastIcon,
  },
  "game_data.sync_completed": {
    labelKey: "audit.action.syncCompleted",
    category: "organization",
    variant: "info",
    icon: BroadcastIcon,
  },
} as const satisfies Record<string, AuditActionMeta>;

export type KnownAuditAction = keyof typeof ACTION_CATALOG;

const CATEGORY_ORDER: readonly AuditActionCategory[] = [
  "results",
  "sanctions",
  "competition",
  "scheduling",
  "teams",
  "permissions",
  "organization",
];

const COMPETITION_CATEGORIES: readonly AuditActionCategory[] = [
  "results",
  "sanctions",
  "competition",
  "scheduling",
  "teams",
  "permissions",
];

const CATEGORY_LABEL_KEY = {
  results: "audit.category.results",
  sanctions: "audit.category.sanctions",
  competition: "audit.category.competition",
  scheduling: "audit.category.scheduling",
  teams: "audit.category.teams",
  permissions: "audit.category.permissions",
  organization: "audit.category.organization",
} as const satisfies Record<AuditActionCategory, ParameterlessMessageKey>;

const OBJECT_TYPE_META = {
  competition: { labelKey: "audit.objectType.competition", icon: TrophyIcon },
  team: { labelKey: "audit.objectType.team", icon: UsersIcon },
  encounter: { labelKey: "audit.objectType.encounter", icon: SoccerBallIcon },
  fixture: { labelKey: "audit.objectType.fixture", icon: CalendarDotsIcon },
  sanction: { labelKey: "audit.objectType.sanction", icon: WarningIcon },
  actor: { labelKey: "audit.objectType.actor", icon: UserIcon },
  billing: { labelKey: "audit.objectType.billing", icon: TicketIcon },
  organization: { labelKey: "audit.objectType.organization", icon: BuildingsIcon },
} as const satisfies Record<
  string,
  { readonly labelKey: ParameterlessMessageKey; readonly icon: Icon }
>;

function isKnownAuditAction(action: string): action is KnownAuditAction {
  return Object.hasOwn(ACTION_CATALOG, action);
}

function isKnownObjectType(type: string): type is keyof typeof OBJECT_TYPE_META {
  return Object.hasOwn(OBJECT_TYPE_META, type);
}

export function auditActionLabel(action: string, t: Translator): string {
  return isKnownAuditAction(action) ? t(ACTION_CATALOG[action].labelKey) : action;
}

export type AuditActionBadgeMeta = {
  readonly variant: AuditBadgeVariant;
  readonly icon?: Icon;
};

export type AuditObjectMeta = {
  readonly label: string;
  readonly icon: Icon;
};

export type AuditActionGroup = {
  readonly category: string;
  readonly label: string;
  readonly items: readonly { readonly value: string; readonly label: string }[];
};

export function auditActionBadgeMeta(action: string): AuditActionBadgeMeta {
  if (isKnownAuditAction(action)) {
    const entry: AuditActionMeta = ACTION_CATALOG[action];
    return { variant: entry.variant, icon: entry.icon };
  }
  return { variant: "neutral" };
}

export function auditActionGroups(
  t: Translator,
  options: { readonly competitionScoped: boolean; readonly extraActions?: readonly string[] },
): readonly AuditActionGroup[] {
  const categories = options.competitionScoped ? COMPETITION_CATEGORIES : CATEGORY_ORDER;
  const knownEntries = Object.entries(ACTION_CATALOG);
  const groups: AuditActionGroup[] = categories.map((category) => ({
    category,
    label: t(CATEGORY_LABEL_KEY[category]),
    items: knownEntries
      .filter(([, meta]) => meta.category === category)
      .map(([value, meta]) => ({ value, label: t(meta.labelKey) })),
  }));
  const extraUnknown = (options.extraActions ?? []).filter((action) => !isKnownAuditAction(action));
  if (extraUnknown.length > 0) {
    groups.push({
      category: "other",
      label: t("audit.objectType.other"),
      items: [...new Set(extraUnknown)].map((value) => ({ value, label: value })),
    });
  }
  return groups;
}

export function auditObjectMeta(type: string, t: Translator): AuditObjectMeta {
  if (isKnownObjectType(type)) {
    const entry = OBJECT_TYPE_META[type];
    return { label: t(entry.labelKey), icon: entry.icon };
  }
  return { label: t("audit.objectType.other"), icon: InfoIcon };
}

export function auditActorInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}
