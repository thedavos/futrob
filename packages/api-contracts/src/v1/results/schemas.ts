import { z } from "zod";

const providerMatchRefSchema = z.object({
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalId: z.string().min(1),
});

export const officialSlotSelectionSchema = z.object({
  officialSlot: z.union([z.literal(1), z.literal(2)]),
  providerMatchRef: providerMatchRefSchema,
});

export const selectionStatusSchema = z.enum([
  "awaiting_provider_data",
  "candidates_available",
  "selection_in_progress",
  "awaiting_opponent_confirmation",
  "confirmed",
  "disputed",
  "organizer_review",
  "approved",
  "voided",
]);

export const integrityFlagSchema = z.object({
  code: z.enum(["provider_data_incomplete", "provider_match_disconnected"]),
  providerMatchRef: providerMatchRefSchema,
});

export const officialMatchSelectionSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  status: selectionStatusSchema,
  version: z.number().int().nonnegative(),
  round: z.number().int().nonnegative(),
  currentProposalId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const officialSelectionProposalSchema = z.object({
  id: z.string().min(1),
  round: z.number().int().nonnegative(),
  sequence: z.number().int().nonnegative(),
  /** Null only for proposals stored before Team attribution existed. */
  proposingTeamId: z.string().min(1).nullable(),
  proposedByActorId: z.string().min(1),
  slots: z.array(officialSlotSelectionSchema).min(1).max(2),
  supersedesProposalId: z.string().min(1).nullable(),
  /** Redacted audit text. */
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

/** Audit entry without its command key or request fingerprint. */
export const officialSelectionActionSchema = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1).nullable(),
  type: z.enum([
    "proposed",
    "confirmed",
    "approved",
    "integrity_review_required",
    "rejected",
    "alternative_proposed",
    "dispute_opened",
    "review_started",
    "dispute_resolved_approved",
    "returned_to_selection",
    "voided",
    "reference_reuse_rejected",
    "legacy_review_required",
  ]),
  fromStatus: selectionStatusSchema.nullable(),
  toStatus: selectionStatusSchema.nullable(),
  versionBefore: z.number().int().nonnegative(),
  versionAfter: z.number().int().nonnegative(),
  actorId: z.string().min(1),
  teamId: z.string().min(1).nullable(),
  capacity: z.enum(["team", "operator", "system"]),
  /** Redacted audit text. */
  reason: z.string().nullable(),
  officialResultId: z.string().min(1).nullable(),
  details: z
    .object({
      integrityFlags: z.array(integrityFlagSchema).optional(),
      acknowledgedFlags: z.array(integrityFlagSchema).optional(),
      conflictingReference: providerMatchRefSchema.optional(),
      selectedProposalId: z.string().min(1).optional(),
      disputeId: z.string().min(1).optional(),
    })
    .nullable(),
  occurredAt: z.string().datetime(),
});

export const matchDisputeSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "under_review", "resolved"]),
  openedByActorId: z.string().min(1),
  openedByTeamId: z.string().min(1),
  /** Redacted audit text. */
  openedReason: z.string(),
  openedAt: z.string().datetime(),
  reviewStartedAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolution: z.enum(["approved_proposal", "returned_to_selection"]).nullable(),
  resolutionProposalId: z.string().min(1).nullable(),
  /** Redacted audit text. */
  resolutionReason: z.string().nullable(),
});

export const officialSelectionAllowedActionSchema = z.enum([
  "propose",
  "confirm",
  "reject",
  "propose_alternative",
  "open_dispute",
  "review_dispute",
  "resolve_dispute",
  "void",
]);

export const officialSelectionViewSchema = z.object({
  encounterId: z.string().min(1),
  /** Null before the first proposal. */
  selection: officialMatchSelectionSchema.nullable(),
  proposals: z.array(officialSelectionProposalSchema),
  actions: z.array(officialSelectionActionSchema),
  disputes: z.array(matchDisputeSchema),
  activeDispute: matchDisputeSchema.nullable(),
  approvedResultId: z.string().min(1).nullable(),
  integrityFlags: z.array(integrityFlagSchema),
  /** Commands the requesting Team can issue now; version checks still apply. */
  allowedActions: z.array(officialSelectionAllowedActionSchema),
});

export const approvedOfficialResultSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  status: z.enum(["approved", "voided"]),
  approvalBasis: z.enum(["team_agreement", "operator_resolution"]).nullable(),
  proposalId: z.string().min(1).nullable(),
  approvedAt: z.string().datetime(),
});

export const officialSelectionCommandResponseSchema = z.object({
  selection: officialMatchSelectionSchema,
  proposal: officialSelectionProposalSchema.nullable(),
  /** Audit entries the command wrote, in order. */
  actions: z.array(officialSelectionActionSchema),
  dispute: matchDisputeSchema.nullable(),
  /** Set only when this command approved a result. */
  approvedResult: approvedOfficialResultSchema.nullable(),
  integrityFlags: z.array(integrityFlagSchema),
  /** True when the command key had already produced this outcome. */
  replayed: z.boolean(),
});

export const getTeamOfficialSelectionQuerySchema = z.object({
  actingTeamId: z.string().min(1),
});

const teamCommandSchema = z.object({
  /** Team the authenticated actor speaks for; the server verifies the representation. */
  actingTeamId: z.string().min(1),
  /** Selection version the caller read; `0` before the first proposal. */
  expectedVersion: z.number().int().nonnegative(),
  /** Client-chosen key; repeating it with the same payload returns the original outcome. */
  commandKey: z.string().trim().min(1).max(200),
});

const slotSelectionsSchema = z.array(officialSlotSelectionSchema).min(1).max(2);
const auditReasonSchema = z.string().max(1000);

export const proposeOfficialSelectionRequestSchema = teamCommandSchema.extend({
  selections: slotSelectionsSchema,
});

export const confirmOfficialSelectionRequestSchema = teamCommandSchema;

export const rejectOfficialSelectionRequestSchema = teamCommandSchema.extend({
  reason: auditReasonSchema,
});

export const proposeAlternativeOfficialSelectionRequestSchema = teamCommandSchema.extend({
  selections: slotSelectionsSchema,
  reason: auditReasonSchema,
});

export const openMatchDisputeRequestSchema = teamCommandSchema.extend({
  reason: auditReasonSchema,
});

export type OfficialSelectionViewDto = z.infer<typeof officialSelectionViewSchema>;
export type OfficialSelectionCommandResponse = z.infer<
  typeof officialSelectionCommandResponseSchema
>;
export type OfficialSelectionProposalDto = z.infer<typeof officialSelectionProposalSchema>;
export type OfficialSelectionActionDto = z.infer<typeof officialSelectionActionSchema>;
export type MatchDisputeDto = z.infer<typeof matchDisputeSchema>;
export type GetTeamOfficialSelectionQuery = z.infer<typeof getTeamOfficialSelectionQuerySchema>;
export type ProposeOfficialSelectionRequest = z.infer<typeof proposeOfficialSelectionRequestSchema>;
export type ConfirmOfficialSelectionRequest = z.infer<typeof confirmOfficialSelectionRequestSchema>;
export type RejectOfficialSelectionRequest = z.infer<typeof rejectOfficialSelectionRequestSchema>;
export type ProposeAlternativeOfficialSelectionRequest = z.infer<
  typeof proposeAlternativeOfficialSelectionRequestSchema
>;
export type OpenMatchDisputeRequest = z.infer<typeof openMatchDisputeRequestSchema>;
