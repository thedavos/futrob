import { describe, expect, it, vi } from "vite-plus/test";
import { asActorId, asOrganizationId, ok } from "@futrob/shared-kernel";
import { createOrgTestHarness } from "../test-harness.ts";
import { ListOrganizationMembersUseCase } from "./list-organization-members.use-case.ts";

const organizationId = asOrganizationId("org-a");
const actorId = asActorId("organizer");
const joinedAt = new Date("2026-01-01T00:00:00Z");
function setup() {
  const harness = createOrgTestHarness();
  const contacts = {
    listByActorIds: vi.fn(async () => [
      { actorId, displayName: "Organizer", email: "organizer@example.test" },
    ]),
  };
  const access = {
    summarize: vi.fn(async () => ok(new Map([[actorId, { kind: "inherited" as const }]]))),
  };
  const useCase = new ListOrganizationMembersUseCase({ ...harness, contacts, access });
  return { ...harness, useCase, contacts, access };
}

describe("ListOrganizationMembersUseCase", () => {
  it("authorizes before reading contacts or competition facts", async () => {
    const world = setup();
    const result = await world.useCase.execute({ actorId, organizationId });
    expect(result.isOk()).toBe(false);
    expect(world.contacts.listByActorIds).not.toHaveBeenCalled();
    expect(world.access.summarize).not.toHaveBeenCalled();
  });

  it("returns the complete tenant directory, preserving null identity and organizational roles", async () => {
    const world = setup();
    await world.memberships.add({
      actorId,
      organizationId,
      role: "organizer",
      createdAt: joinedAt,
    });
    await world.memberships.add({
      actorId: asActorId("plain"),
      organizationId,
      role: "member",
      createdAt: joinedAt,
    });
    await world.memberships.add({
      actorId: asActorId("foreign"),
      organizationId: asOrganizationId("org-b"),
      role: "member",
      createdAt: joinedAt,
    });
    const result = await world.useCase.execute({ actorId, organizationId });
    if (!result.isOk()) throw result.error;
    expect(result.value.members).toEqual([
      {
        actorId,
        displayName: "Organizer",
        email: "organizer@example.test",
        role: "organizer",
        joinedAt,
        access: { kind: "inherited" },
      },
      {
        actorId: "plain",
        displayName: null,
        email: null,
        role: "member",
        joinedAt,
        access: { kind: "none" },
      },
    ]);
    expect(world.contacts.listByActorIds).toHaveBeenCalledWith([actorId, asActorId("plain")]);
  });

  it("allows a grant-only reader without adding that caller to the directory", async () => {
    const world = setup();
    const callerId = asActorId("grant-reader");
    await world.memberships.add({
      actorId,
      organizationId,
      role: "organizer",
      createdAt: joinedAt,
    });
    const useCase = new ListOrganizationMembersUseCase({
      ...world,
      authorization: {
        ...world.authorization,
        decide: async (request) => ({
          allowed:
            request.actorId === callerId && request.permission === "organizations.memberships.read",
          permission: request.permission,
          scope: request.scope,
          reason: "allowed",
        }),
      },
    });
    const result = await useCase.execute({ actorId: callerId, organizationId });
    if (!result.isOk()) throw result.error;
    expect(result.value.members.map((member) => member.actorId)).toEqual([actorId]);
    expect(world.access.summarize).toHaveBeenCalledWith(expect.objectContaining({ callerId }));
  });

  it("rejects an overflow before enrichment rather than returning a partial directory", async () => {
    const world = setup();
    await world.memberships.add({
      actorId,
      organizationId,
      role: "organizer",
      createdAt: joinedAt,
    });
    for (let index = 0; index < 500; index += 1) {
      await world.memberships.add({
        actorId: asActorId(`member-${index}`),
        organizationId,
        role: "member",
        createdAt: joinedAt,
      });
    }
    const result = await world.useCase.execute({ actorId, organizationId });
    if (result.isOk()) throw new Error("Expected overflow");
    expect(result.error.code).toBe("organizations.member_directory_limit_reached");
    expect(world.contacts.listByActorIds).not.toHaveBeenCalled();
    expect(world.access.summarize).not.toHaveBeenCalled();
  });
});
