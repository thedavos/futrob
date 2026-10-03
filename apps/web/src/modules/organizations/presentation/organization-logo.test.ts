import { describe, expect, it } from "vite-plus/test";
import { logoFileProblem, organizationLogoUrl, organizationMonogram } from "./organization-logo.ts";

describe("organizationMonogram", () => {
  it.each([
    ["Liga Norte", "LN"],
    ["liga del norte", "LD"],
    ["Liga", "LI"],
    ["  Ñandú FC  ", "ÑF"],
    ["X", "X"],
    ["", "?"],
    ["   ", "?"],
  ])("turns %j into %j", (name, expected) => {
    expect(organizationMonogram(name)).toBe(expected);
  });
});

describe("organizationLogoUrl", () => {
  it("serves an upload from the public media route", () => {
    expect(
      organizationLogoUrl({ kind: "upload", key: "organization-logos/org-1/crest-1.png" }),
    ).toBe("/media/organization-logos/org-1/crest-1.png");
  });

  it("has no image for the monogram", () => {
    expect(organizationLogoUrl({ kind: "monogram" })).toBeNull();
  });
});

describe("logoFileProblem", () => {
  const MB = 1024 * 1024;

  it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s up to 2 MB", (type) => {
    expect(logoFileProblem({ type, size: 2 * MB })).toBeNull();
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("rejects the type %j", (type) => {
    expect(logoFileProblem({ type, size: 1000 })).toBe("invalidType");
  });

  it("rejects a file over 2 MB", () => {
    expect(logoFileProblem({ type: "image/png", size: 2 * MB + 1 })).toBe("tooLarge");
  });
});
