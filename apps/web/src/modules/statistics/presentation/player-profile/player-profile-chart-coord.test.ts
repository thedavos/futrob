import { describe, expect, it } from "vite-plus/test";
import { chartCoordSchema } from "./player-profile-chart-coord.ts";

describe("chartCoordSchema", () => {
  it("accepts finite numbers and numeric strings", () => {
    expect(chartCoordSchema.safeParse(12).data).toBe(12);
    expect(chartCoordSchema.safeParse("8.5").data).toBe(8.5);
  });

  it("rejects values that are not a finite coordinate", () => {
    expect(chartCoordSchema.safeParse("nope").success).toBe(false);
    expect(chartCoordSchema.safeParse(Number.NaN).success).toBe(false);
    expect(chartCoordSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });
});
