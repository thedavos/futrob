import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Caption } from "./caption.tsx";

describe("Caption", () => {
  it("renders muted metadata by default", () => {
    const markup = renderToStaticMarkup(createElement(Caption, null, "Actualizado hace 2 horas"));

    expect(markup).toContain('data-slot="caption"');
    expect(markup).toContain('data-tone="muted"');
    expect(markup.startsWith("<p")).toBe(true);
  });

  it("renders as a span when asked", () => {
    const markup = renderToStaticMarkup(createElement(Caption, { as: "span" }, "J4"));

    expect(markup.startsWith("<span")).toBe(true);
  });
});
