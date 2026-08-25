import { createElement } from "react";
import { describe, expect, it } from "vite-plus/test";

import { titleWhenTruncated } from "./title-when-truncated.ts";

describe("titleWhenTruncated", () => {
  it("uses string children when truncating", () => {
    expect(titleWhenTruncated(true, "Un título muy largo")).toBe("Un título muy largo");
  });

  it("keeps an explicit title", () => {
    expect(titleWhenTruncated(true, "Visible", "Completo")).toBe("Completo");
  });

  it("does not invent a title when not truncating", () => {
    expect(titleWhenTruncated(false, "Visible")).toBeUndefined();
  });

  it("does not invent a title from element children", () => {
    expect(titleWhenTruncated(true, createElement("span", null, "x"))).toBeUndefined();
  });
});
