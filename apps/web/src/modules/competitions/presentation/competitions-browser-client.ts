import {
  getCompetitionDraftResponseSchema,
  type GetCompetitionDraftResponse,
} from "@futrob/api-contracts";

export async function getCompetitionDraft(
  organizationId: string,
  competitionId: string,
): Promise<GetCompetitionDraftResponse> {
  const response = await fetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("competitions.load_failed");
  return getCompetitionDraftResponseSchema.parse(json);
}
