import type { Permission } from "@futrob/shared-kernel";
import type { RbacActorKey } from "./rbac-matrix.fixture.ts";
import { RBAC_PROBE_PERMISSIONS, type RbacMatrixCase } from "./rbac-matrix.oracle.ts";
import {
  buildEncounterParticipationCases,
  buildGrantPrecedenceCases,
} from "./rbac-matrix.cases.encounter-grants.ts";
import { buildIsolationCases, buildRoleBundleCases } from "./rbac-matrix.cases.role-isolation.ts";

/** Full automated matrix registry. */
export const RBAC_MATRIX_CASES: readonly RbacMatrixCase[] = [
  ...buildRoleBundleCases(),
  ...buildIsolationCases(),
  ...buildEncounterParticipationCases(),
  ...buildGrantPrecedenceCases(),
];

export function rbacMatrixCoverageSummary() {
  const byFamily: Record<string, number> = {};
  for (const matrixCase of RBAC_MATRIX_CASES) {
    const family = matrixCase.id.split("/")[0] ?? "unknown";
    byFamily[family] = (byFamily[family] ?? 0) + 1;
  }
  return {
    total: RBAC_MATRIX_CASES.length,
    byFamily,
    actors: [
      "superuser",
      "organizer",
      "organizationStaff",
      "organizationMember",
      "competitionStaff",
      "competitionCaptain",
      "competitionPlayer",
      "rosterCaptain",
      "viceCaptain",
      "rosterPlayer",
      "rivalCaptain",
      "outsider",
      "organizerB",
    ],
    permissions: [...RBAC_PROBE_PERMISSIONS],
  } satisfies {
    readonly total: number;
    readonly byFamily: Record<string, number>;
    readonly actors: readonly RbacActorKey[];
    readonly permissions: readonly Permission[];
  };
}
