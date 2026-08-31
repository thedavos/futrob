import { describe, expect, it } from "vite-plus/test";
import {
  chartTooltipContentSchema,
  chartTooltipFromParsed,
} from "./player-profile-chart-tooltip.ts";

describe("chart tooltip contract", () => {
  it("reads a line tooltip payload", () => {
    const parsed = chartTooltipContentSchema.safeParse({
      label: "20 ago",
      payload: [{ dataKey: "rating", value: 7.2 }],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(chartTooltipFromParsed(parsed.data)).toEqual({
      label: "20 ago",
      dataKey: "rating",
      name: undefined,
      value: 7.2,
    });
  });

  it("rejects a payload that is not a tooltip", () => {
    expect(chartTooltipContentSchema.safeParse({ payload: "nope" }).success).toBe(false);
  });
});
