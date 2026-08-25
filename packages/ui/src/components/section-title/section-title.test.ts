import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { SectionTitle } from "./section-title.tsx";

describe("SectionTitle", () => {
  it("renders an h2 with the label role by default", () => {
    const markup = renderToStaticMarkup(createElement(SectionTitle, null, "Rendimiento"));

    expect(markup).toContain('data-slot="section-title"');
    expect(markup).toContain('data-tone="default"');
    expect(markup.startsWith("<h2")).toBe(true);
  });

  it("renders the requested heading level", () => {
    const markup = renderToStaticMarkup(createElement(SectionTitle, { as: "h3" }, "Atributos"));

    expect(markup.startsWith("<h3")).toBe(true);
  });
});
