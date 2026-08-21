import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { RESULT_PERMISSION } from "@futrob/results";
import { ENCOUNTER_PERMISSION } from "@futrob/scheduling";
import type { RbacMatrixCase } from "./rbac-matrix.oracle.ts";
import { TEAM_PERMISSION } from "@futrob/teams";

export function buildEncounterParticipationCases(): RbacMatrixCase[] {
  return [
    {
      id: "encounter/participant-captain/propose",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-vice/propose",
      actor: "viceCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-player/read",
      actor: "rosterPlayer",
      permission: ENCOUNTER_PERMISSION.read,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/participant-player/no-propose",
      actor: "rosterPlayer",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/participant-captain/no-schedule-manage",
      actor: "rosterCaptain",
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/participant-captain/no-result-approve",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.resultApprove,
      scope: "orgA.compA.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/rival-captain/propose",
      actor: "rivalCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/wrong-team-scope",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamB.encounter",
      expected: { allowed: false, reason: "scope-mismatch" },
    },
    {
      id: "encounter/teamA-scope-ok",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/rival-on-own-team-scope",
      actor: "rivalCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamRival.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/roster-captain-on-rival-team-scope",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compA.teamRival.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/sibling-competition",
      actor: "rosterCaptain",
      permission: RESULT_PERMISSION.officialSelectionPropose,
      scope: "orgA.compSibling.encounter",
      expected: { allowed: false, reason: "no-assignment" },
    },
    {
      id: "encounter/org-staff/schedule-manage",
      actor: "organizationStaff",
      permission: ENCOUNTER_PERMISSION.scheduleManage,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "encounter/org-staff/result-approve",
      actor: "organizationStaff",
      permission: RESULT_PERMISSION.resultApprove,
      scope: "orgA.compA.encounter",
      expected: { allowed: true, reason: "allowed" },
    },
  ];
}

export function buildGrantPrecedenceCases(): RbacMatrixCase[] {
  return [
    {
      id: "grants/same-scope-deny-beats-bundle",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "deny-org-update",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/same-scope-deny-beats-allow",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "allow-org-update",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "deny-org-update-2",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/specific-allow-overrides-org-deny",
      actor: "organizationStaff",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "deny-org",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "allow-comp",
          actor: "organizationStaff",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "competition",
          scopeIdFrom: "orgA.compA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "grants/specific-deny-overrides-org-allow",
      actor: "organizationMember",
      permission: COMPETITION_PERMISSION.update,
      scope: "orgA.compA",
      grants: [
        {
          id: "allow-org-member",
          actor: "organizationMember",
          permission: COMPETITION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "deny-comp-member",
          actor: "organizationMember",
          permission: COMPETITION_PERMISSION.update,
          effect: "deny",
          scopeType: "competition",
          scopeIdFrom: "orgA.compA",
        },
      ],
      expected: { allowed: false, reason: "denied" },
    },
    {
      id: "grants/team-allow-after-org-deny",
      actor: "rosterCaptain",
      permission: TEAM_PERMISSION.rosterManage,
      scope: "orgA.compA.teamA",
      grants: [
        {
          id: "deny-org-roster",
          actor: "rosterCaptain",
          permission: TEAM_PERMISSION.rosterManage,
          effect: "deny",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
        {
          id: "allow-team-roster",
          actor: "rosterCaptain",
          permission: TEAM_PERMISSION.rosterManage,
          effect: "allow",
          scopeType: "team",
          scopeIdFrom: "orgA.compA.teamA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
    {
      id: "grants/member-org-allow-read-mutate",
      actor: "organizationMember",
      permission: ORGANIZATION_PERMISSION.update,
      scope: "orgA",
      grants: [
        {
          id: "allow-member-update",
          actor: "organizationMember",
          permission: ORGANIZATION_PERMISSION.update,
          effect: "allow",
          scopeType: "organization",
          scopeIdFrom: "orgA",
        },
      ],
      expected: { allowed: true, reason: "allowed" },
    },
  ];
}
