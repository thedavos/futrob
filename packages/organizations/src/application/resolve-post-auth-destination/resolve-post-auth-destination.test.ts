import { describe, expect, it } from "vite-plus/test";
import { asOrganizationId } from "@futrob/shared-kernel";
import { resolvePostAuthDestination } from "./resolve-post-auth-destination.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";

function membership(id: string, name: string): MembershipSummary {
  return {
    organizationId: asOrganizationId(id),
    organizationName: name,
    role: "player",
  };
}

describe("resolvePostAuthDestination", () => {
  it("routes to onboarding when there are no memberships", () => {
    expect(resolvePostAuthDestination([])).toEqual({ kind: "onboarding" });
  });

  it("routes to the single organization when there is one membership", () => {
    const memberships = [membership("org-1", "One")];
    expect(resolvePostAuthDestination(memberships)).toEqual({
      kind: "organization",
      organizationId: asOrganizationId("org-1"),
    });
  });

  it("routes to the organization picker when there are many memberships", () => {
    const memberships = [membership("org-1", "One"), membership("org-2", "Two")];
    expect(resolvePostAuthDestination(memberships)).toEqual({
      kind: "organizationPicker",
      memberships,
    });
  });
});
