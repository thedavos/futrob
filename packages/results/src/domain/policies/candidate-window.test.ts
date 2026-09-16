import { describe, expect, it } from "vite-plus/test";
import { candidateWindowFor } from "./candidate-window.ts";

describe("candidateWindowFor", () => {
  it("candidate-window-product-default", () => {
    expect(candidateWindowFor(new Date("2026-09-14T20:00:00.000Z"))).toEqual({
      from: new Date("2026-09-14T14:00:00.000Z"),
      to: new Date("2026-09-15T02:00:00.000Z"),
    });
  });
});
