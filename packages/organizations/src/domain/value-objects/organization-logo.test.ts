import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { parseOrganizationLogo } from "./organization-logo.ts";

const organizationId = asOrganizationId("org-1");

describe("parseOrganizationLogo", () => {
  it("keeps the monogram", () => {
    expect(parseOrganizationLogo({ kind: "monogram" }, organizationId)).toEqual({
      kind: "monogram",
    });
  });

  it("accepts an upload inside the organization's prefix", () => {
    expect(
      parseOrganizationLogo(
        { kind: "upload", key: "organization-logos/org-1/crest-1.png" },
        organizationId,
      ),
    ).toEqual({ kind: "upload", key: "organization-logos/org-1/crest-1.png" });
  });

  it.each([
    ["another organization", "organization-logos/org-2/crest.png"],
    ["the competition cover prefix", "competition-covers/org-1/crest.png"],
    ["a nested path", "organization-logos/org-1/nested/crest.png"],
    ["a path traversal", "organization-logos/org-1/../org-2/crest.png"],
    ["an unsupported extension", "organization-logos/org-1/crest.gif"],
    ["a missing name", "organization-logos/org-1/.png"],
  ])("rejects an upload from %s", (_label, key) => {
    expect(parseOrganizationLogo({ kind: "upload", key }, organizationId)).toBeNull();
  });
});
