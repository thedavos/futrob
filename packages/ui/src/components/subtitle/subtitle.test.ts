import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Subtitle } from "./subtitle.tsx";

describe("Subtitle", () => {
  it("renders a muted paragraph by default", () => {
    const markup = renderToStaticMarkup(
      createElement(Subtitle, null, "Organiza encuentros oficiales"),
    );

    expect(markup).toContain('data-slot="subtitle"');
    expect(markup).toContain('data-tone="muted"');
    expect(markup.startsWith("<p")).toBe(true);
  });
});
