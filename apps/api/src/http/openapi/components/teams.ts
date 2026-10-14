import {
  teamSchema,
  createTeamRequestSchema,
  competitionRosterMembershipSchema,
  addToRosterRequestSchema,
  listRosterResponseSchema,
  changeRosterRoleRequestSchema,
  rosterStateSchema,
  connectTeamExternalClubRequestSchema,
  teamExternalClubConnectionSchema,
  getTeamExternalClubResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  createRosterInvitationRequestSchema,
  createRosterInvitationResponseSchema,
  rosterInvitationInboxItemSchema,
  competitionTeamManagementSummarySchema,
  competitionTeamManagementDetailResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const Team = namedSchema("Team", teamSchema);
export const CreateTeamRequest = namedSchema("CreateTeamRequest", createTeamRequestSchema);
export const CompetitionRosterMembership = namedSchema(
  "CompetitionRosterMembership",
  competitionRosterMembershipSchema,
);
export const AddToRosterRequest = namedSchema("AddToRosterRequest", addToRosterRequestSchema);
export const ListRosterResponse = namedSchema("ListRosterResponse", listRosterResponseSchema);
export const ChangeRosterRoleRequest = namedSchema(
  "ChangeRosterRoleRequest",
  changeRosterRoleRequestSchema,
);
export const RosterState = namedSchema("RosterState", rosterStateSchema);
export const ConnectTeamExternalClubRequest = namedSchema(
  "ConnectTeamExternalClubRequest",
  connectTeamExternalClubRequestSchema,
);
export const TeamExternalClubConnection = namedSchema(
  "TeamExternalClubConnection",
  teamExternalClubConnectionSchema,
);
export const GetTeamExternalClubResponse = namedSchema(
  "GetTeamExternalClubResponse",
  getTeamExternalClubResponseSchema,
);
export const GetMyTeamsResponse = namedSchema("GetMyTeamsResponse", getMyTeamsResponseSchema);
export const SetActiveTeamRequest = namedSchema("SetActiveTeamRequest", setActiveTeamRequestSchema);
export const SetActiveTeamResponse = namedSchema(
  "SetActiveTeamResponse",
  setActiveTeamResponseSchema,
);
export const CreateRosterInvitationRequest = namedSchema(
  "CreateRosterInvitationRequest",
  createRosterInvitationRequestSchema,
);
export const CreateRosterInvitationResponse = namedSchema(
  "CreateRosterInvitationResponse",
  createRosterInvitationResponseSchema,
);
export const RosterInvitationInboxItem = namedSchema(
  "RosterInvitationInboxItem",
  rosterInvitationInboxItemSchema,
);
export const CompetitionTeamManagementSummary = namedSchema(
  "CompetitionTeamManagementSummary",
  competitionTeamManagementSummarySchema,
);
export const CompetitionTeamManagementDetail = namedSchema(
  "CompetitionTeamManagementDetail",
  competitionTeamManagementDetailResponseSchema,
);
