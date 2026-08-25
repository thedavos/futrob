import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Score } from "./score.tsx";

describe("Score", () => {
  it("renders a start-aligned score by default", () => {
    const markup = renderToStaticMarkup(createElement(Score, null, "2–1"));

    expect(markup).toContain('data-slot="score"');
    expect(markup).toContain('data-align="start"');
    expect(markup.startsWith("<p")).toBe(true);
    expect(markup).toContain("2–1");
  });

  it("centers the score when asked", () => {
    const markup = renderToStaticMarkup(createElement(Score, { align: "center" }, "0–0"));

    expect(markup).toContain('data-align="center"');
  });

  it("marks unavailable tabular values as muted", () => {
    const markup = renderToStaticMarkup(createElement(Score, { tone: "muted" }, "—"));

    expect(markup).toContain('data-tone="muted"');
  });
});
