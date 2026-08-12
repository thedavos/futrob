import { describe, expect, it } from "vite-plus/test";
import type { CompetitionRulesDto } from "@futrob/api-contracts";
import {
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http competitions", () => {
  it("competitions: resumes draft, manages approved participants, publishes and locks structure", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-setup-organizer";
    const outsider = "actor-setup-outsider";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Setup Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const body = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string }; rules: CompetitionRulesDto };
    };
    const organizationId = body.organizationId;
    const competitionId = body.competition.competition.id;

    const patchDraft = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}`,
      {
        method: "PATCH",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          ...onboardingCompetition,
          name: "Liga reanudada",
          rules: {
            regularStage: {
              officialMatchesPerEncounter: 1,
              resolutionMode: "independent_matches",
              winPoints: 3,
              drawPoints: 1,
              lossPoints: 0,
              allowRescheduling: true,
              maxReschedulesPerTeam: 2,
              minimumRescheduleNoticeHours: 12,
              rescheduleRequiresOpponentApproval: true,
              rescheduleRequiresOrganizerApproval: false,
            },
            knockoutStage: null,
            maxRosterSize: 16,
          },
        }),
      },
    );
    expect(patchDraft.status).toBe(200);
    expect(await patchDraft.json()).toMatchObject({
      competition: { name: "Liga reanudada", status: "draft" },
      rules: { maxRosterSize: 16 },
    });

    const participantIds: string[] = [];
    for (const [name, creationKey] of [
      ["Alpha", "setup-alpha"],
      ["Beta", "setup-beta"],
    ] as const) {
      const added = await app.request(
        `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
        {
          method: "POST",
          headers: serviceHeaders(organizer),
          body: JSON.stringify({ kind: "new-team", name, creationKey }),
        },
      );
      expect(added.status).toBe(201);
      const entry = (await added.json()) as { id: string; status: string };
      expect(entry.status).toBe("approved");
      participantIds.push(entry.id);
    }

    const teams = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      headers: serviceHeaders(organizer),
    });
    expect(await teams.json()).toMatchObject({ teams: [{ name: "Alpha" }, { name: "Beta" }] });
    const forbidden = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      { headers: serviceHeaders(outsider) },
    );
    expect(forbidden.status).toBe(403);

    const published = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
      { method: "POST", headers: serviceHeaders(organizer) },
    );
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ competition: { status: "published" } });

    const removeAfterPublish = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants/${participantIds[0]}`,
      { method: "DELETE", headers: serviceHeaders(organizer) },
    );
    expect(removeAfterPublish.status).toBe(409);
    expect(await removeAfterPublish.json()).toMatchObject({ code: "competitions.not_editable" });
  });
});
