import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Eyebrow } from "./eyebrow.tsx";

describe("Eyebrow", () => {
  it("renders a muted label paragraph", () => {
    const markup = renderToStaticMarkup(createElement(Eyebrow, null, "Espacio personal"));

    expect(markup).toContain('data-slot="eyebrow"');
    expect(markup.startsWith("<p")).toBe(true);
    expect(markup).toContain("Espacio personal");
  });
});
