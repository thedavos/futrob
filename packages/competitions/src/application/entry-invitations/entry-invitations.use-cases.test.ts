import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import type { CompetitionStatus } from "../../domain/entities/competition.ts";
import type { CompetitionDraft } from "../../domain/ports/competition.repository.ts";
import { allowAllAuthorization } from "../allow-all-authorization.test-helper.ts";
import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import {
  EnsureEntryInvitationLinkUseCase,
  RegenerateEntryInvitationLinkUseCase,
  ResolvePublicEntryInvitationLinkUseCase,
} from "./entry-invitation-link.use-cases.ts";
import { FakeEntryInvitationRepository } from "./fake-entry-invitation-repository.test-helper.ts";
import { InviteTeamCaptainUseCase } from "./invite-team-captain.use-case.ts";
import {
  ListCompetitionEntryInvitationsUseCase,
  ListMyEntryInvitationsUseCase,
} from "./list-entry-invitations.use-cases.ts";
import {
  DeclineEntryInvitationUseCase,
  RecordEntryInvitationAcceptanceUseCase,
  ResolveEntryInvitationUseCase,
} from "./respond-to-entry-invitation.use-cases.ts";
import { RevokeEntryInvitationUseCase } from "./revoke-entry-invitation.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("cmp-1");
const organizer = asActorId("organizer");
const condor = asActorId("condor");
const ricardo = asActorId("ricardo");
const createdAt = new Date("2026-10-13T12:00:00.000Z");
const scope = { actorId: organizer, organizationId, competitionId };

function draft(status: CompetitionStatus = "draft"): CompetitionDraft {
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Interclubes",
      status,
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: organizer,
      createdAt,
      updatedAt: createdAt,
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt,
    },
  };
}

const denyAll: AuthorizationPort = {
  decide: async (request) => ({ ...request, allowed: false, reason: "denied" }),
  getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
};

function harness(options: { status?: CompetitionStatus; authorization?: AuthorizationPort } = {}) {
  const competitions = new FakeCompetitionRepository([draft(options.status)]);
  const invitations = new FakeEntryInvitationRepository();
  let now = createdAt;
  let nextId = 0;
  let nextCode = 0;
  const clock = { now: () => now };
  const ids = { generate: () => `inv-${++nextId}` };
  const codes = { generateCode: () => `code-${++nextCode}` };
  const authorization = options.authorization ?? allowAllAuthorization;
  const deps = { authorization, competitions, invitations, clock, ids, codes };
  return {
    publish() {
      void competitions.saveDraft(draft("published"));
    },
    advanceDays(days: number) {
      now = new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1000);
    },
    invite: new InviteTeamCaptainUseCase(deps),
    ensureLink: new EnsureEntryInvitationLinkUseCase(deps),
    regenerateLink: new RegenerateEntryInvitationLinkUseCase(deps),
    revoke: new RevokeEntryInvitationUseCase(deps),
    listSent: new ListCompetitionEntryInvitationsUseCase(deps),
    listMine: new ListMyEntryInvitationsUseCase(invitations),
    resolve: new ResolveEntryInvitationUseCase(deps),
    resolvePublicLink: new ResolvePublicEntryInvitationLinkUseCase(deps),
    recordAcceptance: new RecordEntryInvitationAcceptanceUseCase(deps),
    decline: new DeclineEntryInvitationUseCase(deps),
  };
}

async function inviteCondor(app: ReturnType<typeof harness>, message?: string) {
  const sent = await app.invite.execute({
    ...scope,
    inviteeActorId: condor,
    inviteeLabel: " condor10 ",
    message,
  });
  if (!sent.isOk()) throw new Error(`invite failed: ${sent.error.code}`);
  return sent.value;
}

function errorCode(result: { isOk(): boolean; error?: unknown }): string | undefined {
  if (result.isOk()) return undefined;
  const error = result.error;
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

describe("directed entry invitations", () => {
  it("reach their recipient, who sees the organizer's message and competition", async () => {
    const app = harness();
    const sent = await inviteCondor(app, "  ¡Hola! Nos gustaría contar con Cóndor FC.  ");

    const resolved = await app.resolve.execute({
      actorId: condor,
      reference: { invitationId: sent.id },
    });
    const inbox = await app.listMine.execute({ actorId: condor });

    expect(resolved.isOk() && resolved.value.competition.competition.name).toBe("Liga Interclubes");
    expect(inbox.map((invitation) => [invitation.inviteeLabel, invitation.message])).toEqual([
      ["condor10", "¡Hola! Nos gustaría contar con Cóndor FC."],
    ]);
    expect(await app.listMine.execute({ actorId: ricardo })).toEqual([]);
  });

  it("cannot be answered by anyone else", async () => {
    const app = harness();
    const sent = await inviteCondor(app);

    const resolved = await app.resolve.execute({
      actorId: ricardo,
      reference: { invitationId: sent.id },
    });

    expect(errorCode(resolved)).toBe("competitions.entry_invitation_forbidden");
  });

  it("allow one pending invitation per player, and a new one once answered", async () => {
    const app = harness();
    const first = await inviteCondor(app);

    const duplicate = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
    });
    await app.decline.execute({ actorId: condor, invitationId: first.id });
    const again = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
    });

    expect(errorCode(duplicate)).toBe("competitions.entry_invitation_pending_conflict");
    expect(again.isOk()).toBe(true);
  });

  it("reject a message longer than 280 characters and accept one of 280", async () => {
    const app = harness();

    const tooLong = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
      message: "a".repeat(281),
    });
    const atLimit = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
      message: "a".repeat(280),
    });

    expect(errorCode(tooLong)).toBe("competitions.invalid_entry_invitation_message");
    expect(atLimit.isOk() && atLimit.value.message?.length).toBe(280);
  });

  it("expire 14 days after being sent", async () => {
    const app = harness();
    const sent = await inviteCondor(app);
    const reference = { invitationId: sent.id };

    app.advanceDays(13);
    const stillValid = await app.resolve.execute({ actorId: condor, reference });
    app.advanceDays(14);
    const expired = await app.resolve.execute({ actorId: condor, reference });

    expect(stillValid.isOk()).toBe(true);
    expect(errorCode(expired)).toBe("competitions.entry_invitation_expired");
  });

  it("record the entry they produced and still resolve for a retried acceptance", async () => {
    const app = harness();
    const sent = await inviteCondor(app);

    const accepted = await app.recordAcceptance.execute({ invitation: sent, entryId: "entry-9" });
    const retried = await app.resolve.execute({
      actorId: condor,
      reference: { invitationId: sent.id },
    });
    const declineAfter = await app.decline.execute({ actorId: condor, invitationId: sent.id });
    const sentList = await app.listSent.execute(scope);

    expect(accepted.isOk() && [accepted.value.status, accepted.value.acceptedEntryId]).toEqual([
      "accepted",
      "entry-9",
    ]);
    expect(retried.isOk() && retried.value.invitation.acceptedEntryId).toBe("entry-9");
    expect(errorCode(declineAfter)).toBe("competitions.entry_invitation_already_decided");
    expect(sentList.isOk() && sentList.value.map((invitation) => invitation.status)).toEqual([
      "accepted",
    ]);
  });

  it("stop working once revoked by the organizer", async () => {
    const app = harness();
    const sent = await inviteCondor(app);

    const revoked = await app.revoke.execute({ ...scope, invitationId: sent.id });
    const revokedAgain = await app.revoke.execute({ ...scope, invitationId: sent.id });
    const resolved = await app.resolve.execute({
      actorId: condor,
      reference: { invitationId: sent.id },
    });

    expect(revoked.isOk() && revoked.value.status).toBe("revoked");
    expect(errorCode(revokedAgain)).toBe("competitions.entry_invitation_already_decided");
    expect(errorCode(resolved)).toBe("competitions.entry_invitation_revoked");
  });

  it("cannot be sent once the competition is published", async () => {
    const app = harness({ status: "published" });

    const invite = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
    });

    expect(errorCode(invite)).toBe("competitions.not_editable");
  });

  it("require the invitations capability", async () => {
    const app = harness({ authorization: denyAll });

    const invite = await app.invite.execute({
      ...scope,
      inviteeActorId: condor,
      inviteeLabel: "condor10",
    });
    const link = await app.ensureLink.execute(scope);

    expect(errorCode(invite)).toBe("authorization.forbidden");
    expect(errorCode(link)).toBe("authorization.forbidden");
  });
});

describe("the competition invitation link", () => {
  it("is the same link every time the organizer opens it", async () => {
    const app = harness();

    const first = await app.ensureLink.execute(scope);
    const second = await app.ensureLink.execute(scope);

    expect(first.isOk() && first.value.code).toBe("code-1");
    expect(second.isOk() && second.value.code).toBe("code-1");
  });

  it("admits any player, and still does after one team used it", async () => {
    const app = harness();
    const link = await app.ensureLink.execute(scope);
    if (!link.isOk()) throw new Error("link failed");

    await app.recordAcceptance.execute({ invitation: link.value, entryId: "entry-1" });
    const next = await app.resolve.execute({ actorId: ricardo, reference: { code: "code-1" } });

    expect(next.isOk() && next.value.invitation.status).toBe("pending");
  });

  it("stops working after it is regenerated, while the new one works", async () => {
    const app = harness();
    await app.ensureLink.execute(scope);

    const regenerated = await app.regenerateLink.execute(scope);
    const oldCode = await app.resolve.execute({ actorId: condor, reference: { code: "code-1" } });
    const newCode = await app.resolve.execute({ actorId: condor, reference: { code: "code-2" } });

    expect(regenerated.isOk() && regenerated.value.code).toBe("code-2");
    expect(errorCode(oldCode)).toBe("competitions.entry_invitation_revoked");
    expect(newCode.isOk()).toBe(true);
  });

  it("is unknown for a code that was never issued", async () => {
    const app = harness();
    await app.ensureLink.execute(scope);

    const resolved = await app.resolve.execute({ actorId: condor, reference: { code: "nope" } });

    expect(errorCode(resolved)).toBe("competitions.entry_invitation_not_found");
  });
});

describe("the public view of an invitation link", () => {
  it("shows the competition to a visitor who is not signed in", async () => {
    const app = harness();
    await app.ensureLink.execute(scope);

    const resolved = await app.resolvePublicLink.execute({ code: " code-1 " });

    expect(resolved.isOk() && resolved.value.competition.name).toBe("Liga Interclubes");
  });

  it("is unknown for a code that was never issued or belongs to a directed invitation", async () => {
    const app = harness();
    const directed = await inviteCondor(app);

    const unknown = await app.resolvePublicLink.execute({ code: "nope" });
    const byId = await app.resolvePublicLink.execute({ code: directed.id });

    expect(errorCode(unknown)).toBe("competitions.entry_invitation_not_found");
    expect(errorCode(byId)).toBe("competitions.entry_invitation_not_found");
  });

  it("reports a regenerated link as revoked", async () => {
    const app = harness();
    await app.ensureLink.execute(scope);
    await app.regenerateLink.execute(scope);

    const resolved = await app.resolvePublicLink.execute({ code: "code-1" });

    expect(errorCode(resolved)).toBe("competitions.entry_invitation_revoked");
  });

  it("reports the competition as closed once it no longer admits teams", async () => {
    const app = harness();
    await app.ensureLink.execute(scope);
    app.publish();

    const resolved = await app.resolvePublicLink.execute({ code: "code-1" });

    expect(errorCode(resolved)).toBe("competitions.not_editable");
  });
});
