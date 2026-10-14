import {
  createInvitationResponseSchema,
  createOrganizationInvitationRequestSchema,
} from "../organizations/schemas.ts";
import {
  API_ERROR_RESPONSE,
  jsonContent,
  organizationIdParam,
  zodOpenApiSchema,
} from "./openapi-fragments.ts";

export const organizationInvitationOpenApiPaths = {
  "/organizations/{organizationId}/invitations": {
    post: {
      operationId: "createOrganizationInvitation",
      tags: ["organizations"],
      summary: "Create an invitation to join the organization",
      parameters: [organizationIdParam],
      requestBody: {
        required: true,
        content: jsonContent("CreateOrganizationInvitationRequest"),
      },
      responses: {
        "201": {
          description: "Organization invitation created, including the one-time token",
          content: jsonContent("CreateInvitationResponse"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
} as const;

export const organizationInvitationOpenApiSchemas = {
  CreateOrganizationInvitationRequest: zodOpenApiSchema(
    createOrganizationInvitationRequestSchema,
    "input",
  ),
  CreateInvitationResponse: zodOpenApiSchema(createInvitationResponseSchema, "output"),
};
