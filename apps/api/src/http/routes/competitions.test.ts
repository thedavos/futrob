import { describe, expect, it } from "vite-plus/test";
import {
  addCompetitionParticipantResponseSchema,
  completeOrganizationOnboardingResponseSchema,
} from "@futrob/api-contracts";
import {
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const LEAGUE_RULES = {
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
};

describe("apps/api http competitions", () => {
  it("competitions: creates a draft with team range, dates and an uploaded cover", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-profile-organizer";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Profile Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId } = await parseResponse(
      completeOrganizationOnboardingResponseSchema,
      created,
    );
    const createPath = `/api/v1/organizations/${organizationId}/competitions`;

    const draft = await app.request(createPath, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
        name: "Copa Portada",
        teams: { min: 4, max: 8 },
        schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
        cover: { kind: "upload", key: `competition-covers/${organizationId}/ck-1.png` },
      }),
    });
    expect(draft.status).toBe(201);
    expect(await draft.json()).toMatchObject({
      competition: {
        name: "Copa Portada",
        teams: { min: 4, max: 8 },
        schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
        cover: { kind: "upload", key: `competition-covers/${organizationId}/ck-1.png` },
      },
    });

    const invalid = await app.request(createPath, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ ...onboardingCompetition, teams: { min: 6, max: 4 } }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "competitions.invalid_team_range" });

    const foreignCover = await app.request(createPath, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
        cover: { kind: "upload", key: "competition-covers/other-org/ck-1.png" },
      }),
    });
    expect(await foreignCover.json()).toMatchObject({ code: "competitions.invalid_cover" });
  });

  it("competitions: opens registration, freezes structure, lists it in explore and closes back to draft", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-registration-organizer";
    const outsider = "actor-registration-outsider";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Registration Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const body = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
    const base = `/api/v1/organizations/${body.organizationId}/competitions/${body.competition.competition.id}`;

    const configured = await app.request(base, {
      method: "PATCH",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
        rules: LEAGUE_RULES,
        teams: { min: 2, max: 2 },
        schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
      }),
    });
    expect(configured.status).toBe(200);
    expect(await configured.json()).toMatchObject({
      competition: {
        teams: { min: 2, max: 2 },
        schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
        cover: { kind: "preset", preset: "cup" },
      },
    });

    const forbiddenOpen = await app.request(`${base}/registration/open`, {
      method: "POST",
      headers: serviceHeaders(outsider),
    });
    expect(forbiddenOpen.status).toBe(403);

    const opened = await app.request(`${base}/registration/open`, {
      method: "POST",
      headers: serviceHeaders(organizer),
    });
    expect(opened.status).toBe(200);
    expect(await opened.json()).toMatchObject({ competition: { status: "registration" } });

    const frozen = await app.request(base, {
      method: "PATCH",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
        name: "Cambio tardío",
        rules: LEAGUE_RULES,
      }),
    });
    expect(frozen.status).toBe(409);

    const added = await app.request(`${base}/participants`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ kind: "new-team", name: "Gamma", creationKey: "registration-gamma" }),
    });
    expect(added.status).toBe(201);

    const explore = await app.request("/api/v1/competitions/explore?status=registration", {
      headers: serviceHeaders(outsider),
    });
    expect(await explore.json()).toMatchObject({
      total: 1,
      items: [
        {
          competition: {
            status: "registration",
            teams: { min: 2, max: 2 },
            schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
          },
          approvedTeamCount: 1,
        },
      ],
    });

    const competitionId = body.competition.competition.id;
    const applicant = "actor-registration-applicant";
    const applyPath = `/api/v1/competitions/explore/${competitionId}/application`;
    const applyBody = JSON.stringify({
      teamName: "Los Postulantes",
      creationKey: "apply-key-0001",
    });
    const applied = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders(applicant),
      body: applyBody,
    });
    expect(applied.status).toBe(201);
    const application = (await applied.json()) as { entryId: string; status: string };
    expect(application).toMatchObject({ status: "pending", teamName: "Los Postulantes" });

    const stolen = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders(outsider),
      body: applyBody,
    });
    expect(stolen.status).toBe(409);
    expect(await stolen.json()).toMatchObject({ code: "teams.creation_key_conflict" });

    const retried = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders(applicant),
      body: applyBody,
    });
    expect(retried.status).toBe(201);
    expect(await retried.json()).toMatchObject({ entryId: application.entryId });

    const duplicate = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders(applicant),
      body: JSON.stringify({ teamName: "Otro equipo", creationKey: "apply-key-0002" }),
    });
    expect(duplicate.status).toBe(409);

    const pending = await app.request(applyPath, { headers: serviceHeaders(applicant) });
    expect(await pending.json()).toMatchObject({ application: { status: "pending" } });
    const none = await app.request(applyPath, { headers: serviceHeaders(outsider) });
    expect(await none.json()).toEqual({ application: null });

    const approved = await app.request(`${base}/entries/${application.entryId}/approve`, {
      method: "POST",
      headers: serviceHeaders(organizer),
    });
    expect(approved.status).toBe(200);
    const afterApproval = await app.request(applyPath, { headers: serviceHeaders(applicant) });
    expect(await afterApproval.json()).toMatchObject({ application: { status: "approved" } });
    const full = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders("actor-registration-late-full"),
      body: JSON.stringify({ teamName: "Sin cupo", creationKey: "apply-key-full" }),
    });
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ code: "competitions.capacity_reached" });

    const applicantCompetitions = await app.request("/api/v1/competitions/mine", {
      headers: serviceHeaders(applicant),
    });
    expect(await applicantCompetitions.json()).toMatchObject({
      competitions: [{ competition: { id: competitionId }, role: "captain" }],
    });

    const outsiderCompetitions = await app.request("/api/v1/competitions/mine", {
      headers: serviceHeaders(outsider),
    });
    expect(await outsiderCompetitions.json()).toEqual({ competitions: [] });

    const closed = await app.request(`${base}/registration/close`, {
      method: "POST",
      headers: serviceHeaders(organizer),
    });
    expect(closed.status).toBe(200);
    expect(await closed.json()).toMatchObject({ competition: { status: "draft" } });

    const lateApply = await app.request(applyPath, {
      method: "POST",
      headers: serviceHeaders("actor-registration-late"),
      body: JSON.stringify({ teamName: "Tarde", creationKey: "apply-key-late" }),
    });
    expect(lateApply.status).toBe(404);
  });

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
    const body = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
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
          rules: LEAGUE_RULES,
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
      const entry = await parseResponse(addCompetitionParticipantResponseSchema, added);
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

    const outsiderExplore = await app.request("/api/v1/competitions/explore", {
      headers: serviceHeaders(outsider),
    });
    expect(outsiderExplore.status).toBe(200);
    expect(await outsiderExplore.json()).toMatchObject({
      total: 1,
      items: [
        {
          competition: { id: competitionId, name: "Liga reanudada", status: "published" },
          organization: { name: "Setup Org" },
          approvedTeamCount: 2,
        },
      ],
      nextCursor: null,
    });

    const filteredEmpty = await app.request("/api/v1/competitions/explore?q=inexistente", {
      headers: serviceHeaders(outsider),
    });
    expect(await filteredEmpty.json()).toMatchObject({ items: [], total: 0, nextCursor: null });

    const detail = await app.request(`/api/v1/competitions/explore/${competitionId}`, {
      headers: serviceHeaders(outsider),
    });
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      competition: { id: competitionId },
      approvedTeamCount: 2,
    });
  });

  it("competitions: explore hides drafts from other actors", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-explore-organizer";
    const outsider = "actor-explore-outsider";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Draft Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const body = await parseResponse(completeOrganizationOnboardingResponseSchema, created);

    const explore = await app.request("/api/v1/competitions/explore", {
      headers: serviceHeaders(outsider),
    });
    expect(await explore.json()).toMatchObject({ items: [], total: 0 });

    const hidden = await app.request(
      `/api/v1/competitions/explore/${body.competition.competition.id}`,
      { headers: serviceHeaders(outsider) },
    );
    expect(hidden.status).toBe(404);
    expect(await hidden.json()).toMatchObject({ code: "competitions.not_discoverable" });
  });
});
