import { describe, expect, it } from "vite-plus/test";
import { MigrationBaselineInvalidError } from "@/adapters/persistence/migration-runner.ts";
import { parseBaseline } from "./migrate-args.ts";

describe("parseBaseline", () => {
  it("is omitted when the flag is absent", () => {
    expect(parseBaseline([])).toBeUndefined();
    expect(parseBaseline(["--other", "1"])).toBeUndefined();
  });

  it("reads a space-separated or attached integer", () => {
    expect(parseBaseline(["--baseline", "42"])).toBe(42);
    expect(parseBaseline(["--baseline=42"])).toBe(42);
  });

  it("rejects a value with trailing junk that parseInt would accept", () => {
    expect(() => parseBaseline(["--baseline=43oops"])).toThrow(MigrationBaselineInvalidError);
    expect(() => parseBaseline(["--baseline", "43oops"])).toThrow(MigrationBaselineInvalidError);
  });

  it("rejects an empty or missing value", () => {
    expect(() => parseBaseline(["--baseline"])).toThrow(MigrationBaselineInvalidError);
    expect(() => parseBaseline(["--baseline="])).toThrow(MigrationBaselineInvalidError);
  });
});
