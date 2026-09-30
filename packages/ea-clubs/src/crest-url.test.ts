import { describe, expect, it } from "vite-plus/test";
import { buildEaClubCrestUrl, crestAssetIdFromCustomKit } from "./crest-url.ts";

describe("buildEaClubCrestUrl", () => {
  it("builds the FC26 crest CDN URL", () => {
    expect(buildEaClubCrestUrl("fc26", "99160122")).toBe(
      "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png",
    );
  });

  it("builds the FC27 crest CDN URL", () => {
    expect(buildEaClubCrestUrl("fc27", "99160122")).toBe(
      "https://eafc27.content.easports.com/fc/fltOnlineAssets/27A3C9F1-6B2E-4D7A-8C1F-2E9B5A4D6C7E/2027/fcweb/crests/256x256/l99160122.png",
    );
    expect(buildEaClubCrestUrl(" FC27 ", "99160122")).toBe(buildEaClubCrestUrl("fc27", "99160122"));
  });

  it("returns null for missing id or unknown edition", () => {
    expect(buildEaClubCrestUrl("fc27", null)).toBeNull();
    expect(buildEaClubCrestUrl("fc26", null)).toBeNull();
    expect(buildEaClubCrestUrl("fc26", "  ")).toBeNull();
    expect(buildEaClubCrestUrl("fc99", "99160122")).toBeNull();
    expect(buildEaClubCrestUrl("constructor", "99160122")).toBeNull();
  });

  it("reads crestAssetId from customKit", () => {
    expect(crestAssetIdFromCustomKit({ crestAssetId: "99160122" })).toBe("99160122");
    expect(crestAssetIdFromCustomKit(undefined)).toBeNull();
  });
});
