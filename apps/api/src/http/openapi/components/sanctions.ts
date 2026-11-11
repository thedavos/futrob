import {
  competitionSanctionSchema,
  imposeSanctionRequestSchema,
  listCompetitionSanctionsResponseSchema,
  revokeSanctionRequestSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const CompetitionSanction = namedSchema("CompetitionSanction", competitionSanctionSchema);
export const ListCompetitionSanctionsResponse = namedSchema(
  "ListCompetitionSanctionsResponse",
  listCompetitionSanctionsResponseSchema,
);
export const ImposeSanctionRequest = namedSchema(
  "ImposeSanctionRequest",
  imposeSanctionRequestSchema,
);
export const RevokeSanctionRequest = namedSchema(
  "RevokeSanctionRequest",
  revokeSanctionRequestSchema,
);
