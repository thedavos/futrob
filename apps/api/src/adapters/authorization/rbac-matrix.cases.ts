import type { RbacMatrixCase } from "./rbac-matrix.oracle.ts";
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
