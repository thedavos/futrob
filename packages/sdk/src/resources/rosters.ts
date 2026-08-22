import {
  addToRosterRequestSchema,
  addToRosterResponseSchema,
  changeRosterRoleRequestSchema,
  changeRosterRoleResponseSchema,
  closeRosterResponseSchema,
  listRosterResponseSchema,
  openRosterResponseSchema,
  type AddToRosterRequest,
  type AddToRosterResponse,
  type ChangeRosterRoleRequest,
  type ChangeRosterRoleResponse,
  type CloseRosterResponse,
  type ListRosterResponse,
  type OpenRosterResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** Competition-scoped roster operations under `/organizations/.../teams/{teamId}/roster`. */
export function createRostersResource(http: HttpClient) {
  return {
    async list(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<ListRosterResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster",
        ),
        method: "GET",
        options,
        parse: (data) => listRosterResponseSchema.parse(data),
      });
    },

    async add(
      organizationId: string,
      competitionId: string,
      teamId: string,
      input: AddToRosterRequest,
      options: RequestOptions = {},
    ): Promise<AddToRosterResponse> {
      const body = addToRosterRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster",
        ),
        method: "POST",
        body,
        options,
        parse: (data) => addToRosterResponseSchema.parse(data),
      });
    },

    async changeRole(
      organizationId: string,
      competitionId: string,
      teamId: string,
      membershipId: string,
      input: ChangeRosterRoleRequest,
      options: RequestOptions = {},
    ): Promise<ChangeRosterRoleResponse> {
      const body = changeRosterRoleRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster",
          membershipId,
        ),
        method: "PATCH",
        body,
        options,
        parse: (data) => changeRosterRoleResponseSchema.parse(data),
      });
    },

    async close(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<CloseRosterResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster",
          "close",
        ),
        method: "POST",
        options,
        parse: (data) => closeRosterResponseSchema.parse(data),
      });
    },

    async open(
      organizationId: string,
      competitionId: string,
      teamId: string,
      options: RequestOptions = {},
    ): Promise<OpenRosterResponse> {
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "teams",
          teamId,
          "roster",
          "open",
        ),
        method: "POST",
        options,
        parse: (data) => openRosterResponseSchema.parse(data),
      });
    },
  };
}

export type RostersResource = ReturnType<typeof createRostersResource>;
