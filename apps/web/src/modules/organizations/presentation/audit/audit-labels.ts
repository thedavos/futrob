import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

const actionLabels = {
  "competitions.entry_registered": "audit.action.entryRegistered",
  "competitions.entry_approved": "audit.action.entryApproved",
  "competitions.entry_rejected": "audit.action.entryRejected",
  "teams.roster_member_added": "audit.action.rosterMemberAdded",
  "authorization.organization-role.changed": "audit.action.organizationRoleChanged",
  "authorization.grant.created": "audit.action.permissionGranted",
  "authorization.grant.updated": "audit.action.permissionChanged",
  "authorization.grant.deleted": "audit.action.permissionRevoked",
  "authorization.superuser.assigned": "audit.action.superuserAssigned",
  "authorization.superuser.revoked": "audit.action.superuserRevoked",
  "results.integrity_review_required": "audit.action.integrityReviewRequired",
  "results.alternative_proposed": "audit.action.alternativeProposed",
  "results.review_started": "audit.action.reviewStarted",
  "results.returned_to_selection": "audit.action.returnedToSelection",
  "results.reference_reuse_rejected": "audit.action.referenceReuseRejected",
  "results.legacy_review_required": "audit.action.legacyReviewRequired",
  "results.confirmation_expired": "audit.action.confirmationExpired",
  "organizations.created": "audit.action.organizationCreated",
  "competitions.created": "audit.action.competitionCreated",
  "competitions.published": "audit.action.competitionPublished",
  "teams.created": "audit.action.teamCreated",
  "teams.external_club_connected": "audit.action.clubConnected",
  "scheduling.fixture_generated": "audit.action.fixtureGenerated",
  "scheduling.encounter_edited": "audit.action.encounterEdited",
  "scheduling.team_withdrawn": "audit.action.teamWithdrawn",
  "scheduling.round_closed": "audit.action.roundClosed",
  "results.proposed": "audit.action.selectionProposed",
  "results.confirmed": "audit.action.selectionConfirmed",
  "results.approved": "audit.action.resultApproved",
  "results.rejected": "audit.action.selectionRejected",
  "results.dispute_opened": "audit.action.disputeOpened",
  "results.dispute_resolved_approved": "audit.action.disputeResolved",
  "results.voided": "audit.action.resultVoided",
  "billing.plan_changed": "audit.action.planChanged",
  "sanctions.imposed": "audit.action.sanctionImposed",
  "sanctions.revoked": "audit.action.sanctionRevoked",
  "game_data.sync_queued": "audit.action.syncQueued",
  "game_data.sync_completed": "audit.action.syncCompleted",
} satisfies Record<string, ParameterlessMessageKey>;

export function auditActionLabel(action: string, t: Translator): string {
  return isKnownAuditAction(action) ? t(actionLabels[action]) : action;
}

function isKnownAuditAction(action: string): action is keyof typeof actionLabels {
  return Object.hasOwn(actionLabels, action);
}
