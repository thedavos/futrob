import {
  encounterScheduleSnapshotSchema,
  encounterViewSchema,
  encounterCandidateTeamSchema,
  encounterCandidateSchema,
  listEncounterCandidatesResponseSchema,
  scheduleChangeRequestSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeCommandResponseSchema,
  acceptScheduleChangeProposalRequestSchema,
  rejectScheduleChangeProposalRequestSchema,
  counterScheduleChangeProposalRequestSchema,
  resolveScheduleChangeRequestSchema,
  runScheduleChangeExpiryResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const EncounterScheduleSnapshot = namedSchema(
  "EncounterScheduleSnapshot",
  encounterScheduleSnapshotSchema,
);
export const EncounterView = namedSchema("EncounterView", encounterViewSchema);
export const EncounterCandidateTeam = namedSchema(
  "EncounterCandidateTeam",
  encounterCandidateTeamSchema,
);
export const EncounterCandidate = namedSchema("EncounterCandidate", encounterCandidateSchema);
export const ListEncounterCandidatesResponse = namedSchema(
  "ListEncounterCandidatesResponse",
  listEncounterCandidatesResponseSchema,
);
export const ScheduleChangeRequest = namedSchema(
  "ScheduleChangeRequest",
  scheduleChangeRequestSchema,
);
export const CreateScheduleChangeRequest = namedSchema(
  "CreateScheduleChangeRequest",
  createScheduleChangeRequestSchema,
);
export const ListScheduleChangeRequestsResponse = namedSchema(
  "ListScheduleChangeRequestsResponse",
  listScheduleChangeRequestsResponseSchema,
);
export const ScheduleChangeCommandResponse = namedSchema(
  "ScheduleChangeCommandResponse",
  scheduleChangeCommandResponseSchema,
);
export const AcceptScheduleChangeProposalRequest = namedSchema(
  "AcceptScheduleChangeProposalRequest",
  acceptScheduleChangeProposalRequestSchema,
);
export const RejectScheduleChangeProposalRequest = namedSchema(
  "RejectScheduleChangeProposalRequest",
  rejectScheduleChangeProposalRequestSchema,
);
export const CounterScheduleChangeProposalRequest = namedSchema(
  "CounterScheduleChangeProposalRequest",
  counterScheduleChangeProposalRequestSchema,
);
export const ResolveScheduleChangeRequest = namedSchema(
  "ResolveScheduleChangeRequest",
  resolveScheduleChangeRequestSchema,
);
export const RunScheduleChangeExpiryResponse = namedSchema(
  "RunScheduleChangeExpiryResponse",
  runScheduleChangeExpiryResponseSchema,
);
