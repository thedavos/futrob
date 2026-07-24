import { describe, expect, it } from "vite-plus/test";
import { isGameDataProviderKey } from "./provider-key.ts";

describe("isGameDataProviderKey", () => {
  it("accepts known provider keys", () => {
    expect(isGameDataProviderKey("ea-clubs")).toBe(true);
    expect(isGameDataProviderKey("manual")).toBe(true);
    expect(isGameDataProviderKey("screenshot-ocr")).toBe(true);
  });

  it("rejects unknown keys", () => {
    expect(isGameDataProviderKey("steam")).toBe(false);
    expect(isGameDataProviderKey("")).toBe(false);
  });
});
