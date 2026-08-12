export const fixtureOpenApiPaths = {
  "/organizations/{organizationId}/competitions/{competitionId}/fixture": {
    post: {
      operationId: "generateCompetitionFixture",
      tags: ["fixtures"],
      summary: "Generate or replay a deterministic competition fixture",
      parameters: [
        { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
        { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/GenerateCompetitionFixtureRequest" },
          },
        },
      },
      responses: {
        "200": {
          description: "Generated fixture or existing fixture for the same generation version",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/FixturePlan" } },
          },
        },
        "400": { $ref: "#/components/responses/ApiError" },
        "401": { $ref: "#/components/responses/ApiError" },
        "403": { $ref: "#/components/responses/ApiError" },
        "409": { $ref: "#/components/responses/ApiError" },
      },
    },
  },
  "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}": {
    get: {
      operationId: "getCompetitionFixture",
      tags: ["fixtures"],
      summary: "Get an organization-scoped competition fixture",
      parameters: [
        { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
        { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
        { name: "fixturePlanId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "Competition fixture",
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/FixturePlan" } },
          },
        },
        "401": { $ref: "#/components/responses/ApiError" },
        "404": { $ref: "#/components/responses/ApiError" },
      },
    },
  },
  "/organizations/{organizationId}/competitions/{competitionId}/fixtures/{fixturePlanId}/encounters/{encounterId}":
    {
      patch: {
        operationId: "editFixtureEncounter",
        tags: ["fixtures"],
        summary: "Edit an unresolved fixture encounter with audit history",
        parameters: [
          { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
          { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
          { name: "fixturePlanId", in: "path", required: true, schema: { type: "string" } },
          { name: "encounterId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EditFixtureEncounterRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated competition fixture",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/FixturePlan" } },
            },
          },
          "400": { $ref: "#/components/responses/ApiError" },
          "401": { $ref: "#/components/responses/ApiError" },
          "403": { $ref: "#/components/responses/ApiError" },
          "404": { $ref: "#/components/responses/ApiError" },
          "409": { $ref: "#/components/responses/ApiError" },
        },
      },
    },
} as const;

export const fixtureOpenApiSchemas = {
  FixtureParticipantSlot: {
    oneOf: [
      {
        type: "object",
        required: ["kind", "teamId"],
        properties: { kind: { const: "team" }, teamId: { type: "string" } },
      },
      {
        type: "object",
        required: ["kind"],
        properties: { kind: { const: "bye" } },
      },
      {
        type: "object",
        required: ["kind", "encounterId"],
        properties: { kind: { const: "winner" }, encounterId: { type: "string" } },
      },
      {
        type: "object",
        required: ["kind", "stageId", "groupId", "rank"],
        properties: {
          kind: { const: "group-rank" },
          stageId: { type: "string" },
          groupId: { type: "string" },
          rank: { type: "integer", minimum: 1 },
        },
      },
      {
        type: "object",
        required: ["kind", "stageId", "rank"],
        properties: {
          kind: { const: "stage-rank" },
          stageId: { type: "string" },
          rank: { type: "integer", minimum: 1 },
        },
      },
    ],
  },
  FixtureEncounter: {
    type: "object",
    required: [
      "id",
      "stageId",
      "roundId",
      "order",
      "home",
      "away",
      "scheduledStartAt",
      "officialMatchCount",
      "series",
    ],
    properties: {
      id: { type: "string" },
      stageId: { type: "string" },
      roundId: { type: "string" },
      order: { type: "integer", minimum: 1 },
      groupId: { type: "string" },
      home: { $ref: "#/components/schemas/FixtureParticipantSlot" },
      away: { $ref: "#/components/schemas/FixtureParticipantSlot" },
      scheduledStartAt: { type: "string", format: "date-time" },
      officialMatchCount: { type: "integer", enum: [1, 2] },
      series: {
        oneOf: [{ $ref: "#/components/schemas/FixtureSeries" }, { type: "null" }],
      },
    },
  },
  FixtureSeries: {
    type: "object",
    required: ["id", "resolutionMode", "officialMatches"],
    properties: {
      id: { type: "string" },
      resolutionMode: {
        type: "string",
        enum: ["independent_matches", "aggregate_score"],
      },
      officialMatches: {
        type: "array",
        minItems: 1,
        maxItems: 2,
        items: {
          type: "object",
          required: ["id", "slot"],
          properties: {
            id: { type: "string" },
            slot: { type: "integer", enum: [1, 2] },
          },
        },
      },
    },
  },
  FixtureRound: {
    type: "object",
    required: ["id", "stageId", "number", "scheduledStartAt", "encounters"],
    properties: {
      id: { type: "string" },
      stageId: { type: "string" },
      number: { type: "integer", minimum: 1 },
      scheduledStartAt: { type: "string", format: "date-time" },
      encounters: {
        type: "array",
        items: { $ref: "#/components/schemas/FixtureEncounter" },
      },
    },
  },
  FixtureStage: {
    type: "object",
    required: ["id", "kind", "order", "rounds"],
    properties: {
      id: { type: "string" },
      kind: { type: "string", enum: ["league", "groups", "knockout", "playoffs"] },
      order: { type: "integer", minimum: 1 },
      rounds: { type: "array", items: { $ref: "#/components/schemas/FixtureRound" } },
    },
  },
  FixturePlan: {
    type: "object",
    required: [
      "id",
      "revision",
      "status",
      "generationKey",
      "organizationId",
      "competitionId",
      "rulesVersion",
      "generationVersion",
      "format",
      "timeZone",
      "homeAndAway",
      "seed",
      "stages",
    ],
    properties: {
      id: { type: "string" },
      revision: { type: "integer", minimum: 1 },
      status: { type: "string", enum: ["active", "superseded"] },
      generationKey: { type: "string" },
      organizationId: { type: "string" },
      competitionId: { type: "string" },
      rulesVersion: { type: "integer", minimum: 1 },
      generationVersion: { type: "integer", minimum: 1 },
      format: {
        type: "string",
        enum: ["league", "knockout", "groups-knockout", "league-playoffs"],
      },
      timeZone: { type: "string" },
      homeAndAway: { type: "boolean" },
      seed: { type: "array", minItems: 2, items: { type: "string" } },
      stages: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/components/schemas/FixtureStage" },
      },
    },
  },
  GenerateCompetitionFixtureRequest: {
    type: "object",
    required: ["generationVersion", "startsAt", "roundIntervalDays", "homeAndAway"],
    properties: {
      generationVersion: { type: "integer", minimum: 1 },
      startsAt: { type: "string", format: "date-time" },
      roundIntervalDays: { type: "integer", minimum: 1 },
      homeAndAway: { type: "boolean", default: false },
      seed: { type: "array", minItems: 2, items: { type: "string" } },
      groups: {
        type: "object",
        required: ["count", "qualifiersPerGroup"],
        properties: {
          count: { type: "integer", minimum: 2 },
          qualifiersPerGroup: { type: "integer", minimum: 1 },
        },
      },
      playoffs: {
        type: "object",
        required: ["teamCount"],
        properties: { teamCount: { type: "integer", minimum: 2 } },
      },
    },
  },
  EditFixtureEncounterRequest: {
    type: "object",
    required: ["reason"],
    properties: {
      scheduledStartAt: { type: "string", format: "date-time" },
      homeTeamId: { type: "string" },
      awayTeamId: { type: "string" },
      reason: { type: "string", minLength: 1, maxLength: 500 },
      requestId: { type: "string", format: "uuid" },
    },
  },
} as const;
