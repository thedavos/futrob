import { apiErrorSchema } from "../errors.ts";
import { pingResponseSchema } from "../meta/ping.response.ts";
import {
  externalClubSchema,
  getClubMatchesResponseSchema,
  providerMatchSchema,
  searchClubsResponseSchema,
} from "../game-data/schemas.ts";
import { EA_SEARCH_PLATFORM } from "../game-data/ea-search-platform.ts";
import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
  completeOrganizationOnboardingRequestSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
  onboardingStatusSchema,
  saveOnboardingProgressRequestSchema,
} from "../identity/schemas.ts";
import {
  acceptCompetitionInvitationResponseSchema,
  competitionDraftInputSchema,
  competitionDraftSchema,
  getCompetitionDraftResponseSchema,
} from "../competitions/schemas.ts";

/** OpenAPI 3.1 document for Futrob private `/api/v1`. Regenerated via `npm run generate:openapi -w @futrob/api-contracts`. */
export const futrobOpenApiV1 = {
  openapi: "3.1.0",
  info: {
    title: "Futrob Private API",
    version: "0.1.0",
    description:
      "Private HTTP API for Futrob clients (web, Flutter, scripts). Not a public third-party API.",
  },
  servers: [{ url: "/api/v1", description: "Same Worker as apps/web" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "meta", description: "Health and discovery" },
    {
      name: "game-data",
      description: "Provider observations (neutral DTOs; EA stays server-side)",
    },
    { name: "onboarding", description: "Actor onboarding state and path completion" },
    { name: "organizations", description: "Organizations and tenant memberships" },
    { name: "players", description: "Personal player profile and game accounts" },
    { name: "competitions", description: "Organization-scoped competition drafts" },
  ],
  paths: {
    "/meta/ping": {
      get: {
        operationId: "metaPing",
        tags: ["meta"],
        summary: "Health ping",
        security: [],
        responses: {
          "200": {
            description: "Service is up",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PingResponse" },
              },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiJson",
        tags: ["meta"],
        summary: "OpenAPI document (JSON)",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI 3.1 JSON",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },
    "/openapi.yaml": {
      get: {
        operationId: "getOpenApiYaml",
        tags: ["meta"],
        summary: "OpenAPI document (YAML)",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI 3.1 YAML",
            content: { "application/yaml": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/game-data/clubs/search": {
      get: {
        operationId: "searchExternalClubs",
        tags: ["game-data"],
        summary: "Search external clubs via a game-data provider",
        parameters: [
          {
            name: "query",
            in: "query",
            required: true,
            schema: { type: "string", minLength: 1 },
          },
          {
            name: "providerKey",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["ea-clubs", "manual", "screenshot-ocr"],
              default: "ea-clubs",
            },
          },
          {
            name: "platform",
            in: "query",
            required: false,
            schema: { type: "string", default: EA_SEARCH_PLATFORM.CROSS_GEN },
          },
          {
            name: "gameEdition",
            in: "query",
            required: false,
            schema: { type: "string", default: "fc26" },
          },
        ],
        responses: {
          "200": {
            description: "Matching clubs",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SearchClubsResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "502": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/game-data/clubs/{externalClubId}": {
      get: {
        operationId: "getExternalClub",
        tags: ["game-data"],
        summary: "Get external club info",
        parameters: [
          {
            name: "externalClubId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "providerKey",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["ea-clubs", "manual", "screenshot-ocr"],
              default: "ea-clubs",
            },
          },
          {
            name: "platform",
            in: "query",
            required: false,
            schema: { type: "string", default: EA_SEARCH_PLATFORM.CROSS_GEN },
          },
          {
            name: "gameEdition",
            in: "query",
            required: false,
            schema: { type: "string", default: "fc26" },
          },
        ],
        responses: {
          "200": {
            description: "Club",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExternalClub" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
          "502": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/game-data/clubs/{externalClubId}/matches": {
      get: {
        operationId: "getRecentProviderMatches",
        tags: ["game-data"],
        summary: "List recent provider matches for a club",
        parameters: [
          {
            name: "externalClubId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "providerKey",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["ea-clubs", "manual", "screenshot-ocr"],
              default: "ea-clubs",
            },
          },
          {
            name: "platform",
            in: "query",
            required: false,
            schema: { type: "string", default: EA_SEARCH_PLATFORM.CROSS_GEN },
          },
          {
            name: "gameEdition",
            in: "query",
            required: false,
            schema: { type: "string", default: "fc26" },
          },
          {
            name: "matchType",
            in: "query",
            required: false,
            schema: { type: "string", default: "friendlyMatch" },
          },
          {
            name: "maxResultCount",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "Matches",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GetClubMatchesResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "502": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/players/me": {
      get: {
        operationId: "getMyPlayerProfile",
        tags: ["players"],
        summary: "Get the authenticated actor player profile",
        responses: {
          "200": {
            description: "Profile and linked game accounts",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GetMyPlayerProfileResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/players/me/game-accounts": {
      post: {
        operationId: "addMyPlayerGameAccount",
        tags: ["players"],
        summary: "Add a declared EA game identifier to the personal profile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PlayerGameAccountInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Idempotently linked account",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AddMyPlayerGameAccountResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/identity/onboarding": {
      get: {
        operationId: "getOnboardingStatus",
        tags: ["onboarding"],
        summary: "Get the authenticated actor onboarding state",
        responses: {
          "200": {
            description: "Current onboarding state",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/OnboardingStatus" } },
            },
          },
          "401": { $ref: "#/components/responses/ApiError" },
        },
      },
      patch: {
        operationId: "saveOnboardingProgress",
        tags: ["onboarding"],
        summary: "Persist the current onboarding path and step without draft data",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["path", "currentStep"],
                properties: {
                  path: {
                    anyOf: [
                      { type: "string", enum: ["player", "organization", "invitation"] },
                      { type: "null" },
                    ],
                  },
                  currentStep: {
                    type: "string",
                    enum: [
                      "intention",
                      "organization",
                      "competition",
                      "game",
                      "invitation",
                      "game-account",
                      "team",
                      "review",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Saved onboarding state",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/OnboardingStatus" } },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/identity/onboarding/organization": {
      post: {
        operationId: "completeOrganizationOnboarding",
        tags: ["onboarding"],
        summary: "Create an organization and complete the organization onboarding path",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "competition"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 120 },
                  competition: { $ref: "#/components/schemas/CompetitionDraftInput" },
                  gameAccount: {
                    anyOf: [
                      { $ref: "#/components/schemas/PlayerGameAccountInput" },
                      { type: "null" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Completed organization onboarding",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompleteOrganizationOnboardingResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "409": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/identity/onboarding/invitation": {
      post: {
        operationId: "completeInvitationOnboarding",
        tags: ["onboarding"],
        summary: "Accept an invitation and complete the invitation onboarding path",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string", minLength: 1 },
                  gameAccount: {
                    anyOf: [
                      { $ref: "#/components/schemas/PlayerGameAccountInput" },
                      { type: "null" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Completed invitation onboarding",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompleteInvitationOnboardingResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
          "409": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/identity/onboarding/player": {
      post: {
        operationId: "completePlayerOnboarding",
        tags: ["onboarding"],
        summary: "Create a personal profile and complete the player onboarding path",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  gameAccount: {
                    anyOf: [
                      { $ref: "#/components/schemas/PlayerGameAccountInput" },
                      { type: "null" },
                    ],
                  },
                  externalClub: {
                    anyOf: [
                      { $ref: "#/components/schemas/PlayerExternalClubSelectionInput" },
                      { type: "null" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Completed player onboarding",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CompletePlayerOnboardingResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "409": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/organizations/name-availability": {
      post: {
        operationId: "checkOrganizationNameAvailability",
        tags: ["organizations"],
        summary: "Check whether a normalized organization name is globally available",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string", minLength: 1, maxLength: 120 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Name availability",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["available"],
                  properties: { available: { type: "boolean" } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/competitions/invitations/accept": {
      post: {
        operationId: "acceptCompetitionInvitation",
        tags: ["competitions"],
        summary: "Accept a competition invitation and join its contextual membership",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string", minLength: 1 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Competition invitation accepted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AcceptCompetitionInvitationResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/organizations/{organizationId}/competitions/{competitionId}": {
      get: {
        operationId: "getCompetitionDraft",
        tags: ["competitions"],
        summary: "Get an organization-scoped competition draft",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Competition and current rules",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CompetitionDraft" } },
            },
          },
          "401": { $ref: "#/components/responses/ApiError" },
          "403": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
    "/organizations/{organizationId}/competitions/{competitionId}/invitations": {
      post: {
        operationId: "createCompetitionInvitation",
        tags: ["competitions"],
        summary: "Create an invitation scoped to a competition",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["staff", "captain", "player"] },
                  email: { type: "string", format: "email" },
                  expiresInMs: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Competition invitation created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["invitationId", "competitionId", "token", "expiresAt"],
                  properties: {
                    invitationId: { type: "string" },
                    competitionId: { type: "string" },
                    token: { type: "string" },
                    expiresAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "403": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Optional in MVP scaffold; required when identity is wired.",
      },
    },
    schemas: {
      PingResponse: {
        type: "object",
        required: ["ok", "service", "apiVersion"],
        properties: {
          ok: { type: "boolean", const: true },
          service: { type: "string", const: "futrob" },
          apiVersion: { type: "string", const: "v1" },
        },
      },
      ApiError: {
        type: "object",
        required: ["code", "messageKey"],
        properties: {
          code: { type: "string" },
          messageKey: { type: "string" },
          requestId: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
      },
      ExternalClub: {
        type: "object",
        required: ["providerKey", "externalClubId", "name", "platform", "gameEdition", "imageUrl"],
        properties: {
          providerKey: {
            type: "string",
            enum: ["ea-clubs", "manual", "screenshot-ocr"],
          },
          externalClubId: { type: "string" },
          name: { type: "string" },
          platform: { type: "string" },
          gameEdition: { type: "string" },
          imageUrl: { type: ["string", "null"], format: "uri" },
        },
      },
      ProviderMatch: {
        type: "object",
        required: ["id", "provider", "game", "occurredAt", "home", "away", "players", "metadata"],
        properties: {
          id: { type: "string" },
          provider: {
            type: "object",
            required: ["key", "externalMatchId"],
            properties: {
              key: { type: "string", enum: ["ea-clubs", "manual", "screenshot-ocr"] },
              externalMatchId: { type: "string" },
            },
          },
          game: {
            type: "object",
            required: ["edition", "platform", "mode"],
            properties: {
              edition: { type: "string" },
              platform: { type: "string" },
              mode: { type: "string" },
            },
          },
          occurredAt: { type: "string", format: "date-time" },
          home: { $ref: "#/components/schemas/ProviderMatchTeam" },
          away: { $ref: "#/components/schemas/ProviderMatchTeam" },
          players: {
            type: "array",
            items: { $ref: "#/components/schemas/ProviderPlayerMatchStats" },
          },
          metadata: {
            type: "object",
            required: ["durationSeconds", "wasDisconnected", "winnerByForfeit", "completeness"],
            properties: {
              durationSeconds: { type: ["number", "null"] },
              wasDisconnected: { type: "boolean" },
              winnerByForfeit: { type: "boolean" },
              completeness: { type: "string", enum: ["complete", "partial", "unknown"] },
            },
          },
        },
      },
      ProviderMatchTeam: {
        type: "object",
        required: ["externalClubId", "name", "goals"],
        properties: {
          externalClubId: { type: "string" },
          name: { type: "string" },
          goals: { type: "number" },
        },
      },
      ProviderPlayerMatchStats: {
        type: "object",
        required: ["externalPlayerId", "displayName", "goals", "assists", "rating"],
        properties: {
          externalPlayerId: { type: "string" },
          displayName: { type: "string" },
          goals: { type: ["number", "null"] },
          assists: { type: ["number", "null"] },
          rating: { type: ["number", "null"] },
        },
      },
      SearchClubsResponse: {
        type: "object",
        required: ["clubs"],
        properties: {
          clubs: {
            type: "array",
            items: { $ref: "#/components/schemas/ExternalClub" },
          },
        },
      },
      GetClubMatchesResponse: {
        type: "object",
        required: ["matches"],
        properties: {
          matches: {
            type: "array",
            items: { $ref: "#/components/schemas/ProviderMatch" },
          },
        },
      },
      CompetitionDraftInput: {
        type: "object",
        required: ["name", "gameEdition", "platform", "region", "timeZone", "format"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          gameEdition: { type: "string", minLength: 1, maxLength: 40 },
          platform: {
            type: "string",
            enum: ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"],
          },
          region: {
            type: "string",
            enum: [
              "america",
              "south-america",
              "north-central-america",
              "europe",
              "africa",
              "asia",
              "middle-east",
              "oceania",
            ],
          },
          timeZone: { type: "string", minLength: 1, maxLength: 100 },
          format: {
            type: "string",
            enum: ["league", "knockout", "groups-knockout", "league-playoffs"],
          },
        },
      },
      CompetitionMatchRules: {
        type: "object",
        required: [
          "officialMatchesPerEncounter",
          "resolutionMode",
          "winPoints",
          "drawPoints",
          "lossPoints",
          "allowRescheduling",
          "maxReschedulesPerTeam",
          "minimumRescheduleNoticeHours",
          "rescheduleRequiresOpponentApproval",
          "rescheduleRequiresOrganizerApproval",
        ],
        properties: {
          officialMatchesPerEncounter: { type: "integer", enum: [1, 2] },
          resolutionMode: {
            type: "string",
            enum: ["independent_matches", "aggregate_score"],
          },
          winPoints: { type: "number" },
          drawPoints: { type: "number" },
          lossPoints: { type: "number" },
          allowRescheduling: { type: "boolean" },
          maxReschedulesPerTeam: { type: ["integer", "null"], minimum: 0 },
          minimumRescheduleNoticeHours: { type: "integer", minimum: 0 },
          rescheduleRequiresOpponentApproval: { type: "boolean" },
          rescheduleRequiresOrganizerApproval: { type: "boolean" },
        },
      },
      Competition: {
        type: "object",
        required: [
          "id",
          "organizationId",
          "name",
          "status",
          "modality",
          "gameEdition",
          "platform",
          "region",
          "timeZone",
          "format",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string" },
          organizationId: { type: "string" },
          name: { type: "string" },
          status: {
            type: "string",
            enum: ["draft", "published", "paused", "finished", "archived"],
          },
          modality: { type: "string", const: "fc-clubs" },
          gameEdition: { type: "string" },
          platform: {
            type: "string",
            enum: ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"],
          },
          region: {
            type: "string",
            enum: [
              "america",
              "south-america",
              "north-central-america",
              "europe",
              "africa",
              "asia",
              "middle-east",
              "oceania",
            ],
          },
          timeZone: { type: "string" },
          format: {
            type: "string",
            enum: ["league", "knockout", "groups-knockout", "league-playoffs"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CompetitionRules: {
        type: "object",
        required: ["version", "regularStage", "knockoutStage", "awayGoalsEnabled", "createdAt"],
        properties: {
          version: { type: "integer", minimum: 1 },
          regularStage: {
            anyOf: [{ $ref: "#/components/schemas/CompetitionMatchRules" }, { type: "null" }],
          },
          knockoutStage: {
            anyOf: [{ $ref: "#/components/schemas/CompetitionMatchRules" }, { type: "null" }],
          },
          awayGoalsEnabled: { type: "boolean", const: false },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CompetitionDraft: {
        type: "object",
        required: ["competition", "rules"],
        properties: {
          competition: { $ref: "#/components/schemas/Competition" },
          rules: { $ref: "#/components/schemas/CompetitionRules" },
        },
      },
      PlayerProfile: {
        type: "object",
        required: ["id", "createdAt"],
        properties: {
          id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PlayerGameAccountInput: {
        type: "object",
        required: ["identifier", "platform", "gameEdition"],
        properties: {
          identifier: {
            type: "string",
            minLength: 1,
            maxLength: 80,
            description: "EA player identifier declared by the actor",
          },
          platform: {
            type: "string",
            enum: ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"],
            description: "Platform context required by the EA API",
          },
          gameEdition: {
            type: "string",
            minLength: 1,
            maxLength: 40,
            description: "Game edition context required by the EA API",
          },
        },
      },
      PlayerGameAccount: {
        type: "object",
        required: ["id", "playerProfileId", "identifier", "platform", "gameEdition", "createdAt"],
        properties: {
          id: { type: "string" },
          playerProfileId: { type: "string" },
          identifier: {
            type: "string",
            description: "EA player identifier used to correlate matches and statistics",
          },
          platform: {
            type: "string",
            enum: ["playstation", "xbox", "pc", "nintendo-switch-1", "nintendo-switch-2"],
            description: "Platform context used for EA API requests",
          },
          gameEdition: {
            type: "string",
            description: "Game edition context used for EA API requests",
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      GetMyPlayerProfileResponse: {
        type: "object",
        required: ["profile", "gameAccounts", "externalClub"],
        properties: {
          profile: {
            anyOf: [{ $ref: "#/components/schemas/PlayerProfile" }, { type: "null" }],
          },
          gameAccounts: {
            type: "array",
            items: { $ref: "#/components/schemas/PlayerGameAccount" },
          },
          externalClub: {
            anyOf: [
              { $ref: "#/components/schemas/PlayerExternalClubAssociation" },
              { type: "null" },
            ],
          },
        },
      },
      PlayerExternalClubSelectionInput: {
        type: "object",
        required: ["providerKey", "externalClubId", "platform", "gameEdition"],
        properties: {
          providerKey: {
            type: "string",
            enum: ["ea-clubs", "manual", "screenshot-ocr"],
          },
          externalClubId: { type: "string", minLength: 1, maxLength: 80 },
          platform: { type: "string", minLength: 1, maxLength: 40 },
          gameEdition: { type: "string", minLength: 1, maxLength: 40 },
        },
      },
      PlayerExternalClubAssociation: {
        type: "object",
        required: [
          "playerProfileId",
          "providerKey",
          "externalClubId",
          "externalClubName",
          "platform",
          "gameEdition",
          "associatedAt",
        ],
        properties: {
          playerProfileId: { type: "string" },
          providerKey: {
            type: "string",
            enum: ["ea-clubs", "manual", "screenshot-ocr"],
          },
          externalClubId: { type: "string" },
          externalClubName: { type: "string" },
          platform: { type: "string" },
          gameEdition: { type: "string" },
          associatedAt: { type: "string", format: "date-time" },
        },
      },
      AddMyPlayerGameAccountResponse: {
        type: "object",
        required: ["profile", "gameAccount"],
        properties: {
          profile: { $ref: "#/components/schemas/PlayerProfile" },
          gameAccount: { $ref: "#/components/schemas/PlayerGameAccount" },
        },
      },
      OnboardingStatus: {
        type: "object",
        required: ["completed", "completedAt", "version", "path", "currentStep"],
        properties: {
          completed: { type: "boolean" },
          completedAt: { type: ["string", "null"], format: "date-time" },
          version: { type: ["integer", "null"], minimum: 1 },
          path: {
            anyOf: [
              { type: "string", enum: ["player", "organization", "invitation"] },
              { type: "null" },
            ],
          },
          currentStep: {
            anyOf: [
              {
                type: "string",
                enum: [
                  "intention",
                  "organization",
                  "competition",
                  "game",
                  "invitation",
                  "game-account",
                  "team",
                  "review",
                ],
              },
              { type: "null" },
            ],
          },
        },
      },
      CompleteOrganizationOnboardingResponse: {
        type: "object",
        required: [
          "organizationId",
          "name",
          "role",
          "competition",
          "profile",
          "gameAccount",
          "destination",
        ],
        properties: {
          organizationId: { type: "string" },
          name: { type: "string" },
          role: { type: "string", const: "organizer" },
          competition: { $ref: "#/components/schemas/CompetitionDraft" },
          profile: { $ref: "#/components/schemas/PlayerProfile" },
          gameAccount: {
            anyOf: [{ $ref: "#/components/schemas/PlayerGameAccount" }, { type: "null" }],
          },
          destination: {
            type: "object",
            required: ["kind", "organizationId", "competitionId"],
            properties: {
              kind: { type: "string", const: "competition-setup" },
              organizationId: { type: "string" },
              competitionId: { type: "string" },
            },
          },
        },
      },
      CompleteInvitationOnboardingResponse: {
        type: "object",
        required: [
          "organizationId",
          "organizationName",
          "role",
          "competitionId",
          "competitionName",
          "profile",
          "gameAccount",
          "destination",
        ],
        properties: {
          organizationId: { type: "string" },
          organizationName: { type: "string" },
          role: { type: "string", enum: ["organizer", "staff", "captain", "player"] },
          competitionId: { type: "string" },
          competitionName: { type: "string" },
          profile: { $ref: "#/components/schemas/PlayerProfile" },
          gameAccount: {
            anyOf: [{ $ref: "#/components/schemas/PlayerGameAccount" }, { type: "null" }],
          },
          destination: {
            type: "object",
            required: ["kind", "organizationId", "competitionId"],
            properties: {
              kind: { type: "string", const: "competition" },
              organizationId: { type: "string" },
              competitionId: { type: "string" },
            },
          },
        },
      },
      AcceptCompetitionInvitationResponse: {
        type: "object",
        required: [
          "organizationId",
          "organizationName",
          "role",
          "competitionId",
          "competitionName",
          "destination",
        ],
        properties: {
          organizationId: { type: "string" },
          organizationName: { type: "string" },
          role: { type: "string", enum: ["organizer", "staff", "captain", "player"] },
          competitionId: { type: "string" },
          competitionName: { type: "string" },
          competitionRole: { type: "string", enum: ["staff", "captain", "player"] },
          destination: {
            type: "object",
            required: ["kind", "organizationId", "competitionId"],
            properties: {
              kind: { type: "string", const: "competition" },
              organizationId: { type: "string" },
              competitionId: { type: "string" },
            },
          },
        },
      },
      CompletePlayerOnboardingResponse: {
        type: "object",
        required: ["profile", "gameAccount", "externalClub", "destination"],
        properties: {
          profile: { $ref: "#/components/schemas/PlayerProfile" },
          gameAccount: {
            anyOf: [{ $ref: "#/components/schemas/PlayerGameAccount" }, { type: "null" }],
          },
          externalClub: {
            anyOf: [
              { $ref: "#/components/schemas/PlayerExternalClubAssociation" },
              { type: "null" },
            ],
          },
          destination: { type: "string", const: "personal" },
        },
      },
    },
    responses: {
      ApiError: {
        description: "API error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
  },
} as const;

/** Keep Zod schemas referenced so drift is harder during refactors. */
void apiErrorSchema;
void pingResponseSchema;
void externalClubSchema;
void providerMatchSchema;
void searchClubsResponseSchema;
void getClubMatchesResponseSchema;
void onboardingStatusSchema;
void saveOnboardingProgressRequestSchema;
void completeOrganizationOnboardingRequestSchema;
void completeOrganizationOnboardingResponseSchema;
void completeInvitationOnboardingRequestSchema;
void completeInvitationOnboardingResponseSchema;
void completePlayerOnboardingRequestSchema;
void completePlayerOnboardingResponseSchema;
void competitionDraftInputSchema;
void competitionDraftSchema;
void getCompetitionDraftResponseSchema;
void acceptCompetitionInvitationResponseSchema;
