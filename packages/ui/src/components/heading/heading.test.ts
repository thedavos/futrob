import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Heading } from "./heading.tsx";

describe("Heading", () => {
  it("renders the requested heading level", () => {
    const markup = renderToStaticMarkup(createElement(Heading, { as: "h3" }, "Jornada 4"));

    expect(markup.startsWith("<h3")).toBe(true);
    expect(markup).toContain('data-look="title"');
  });

  it("exposes the full string when truncated", () => {
    const markup = renderToStaticMarkup(
      createElement(Heading, { truncate: true }, "Un título muy largo"),
    );

    expect(markup).toContain('data-truncate="true"');
    expect(markup).toContain('title="Un título muy largo"');
  });

  it("steps the look down for h4–h6", () => {
    const markup = renderToStaticMarkup(createElement(Heading, { as: "h4" }, "Detalle"));

    expect(markup.startsWith("<h4")).toBe(true);
    expect(markup).toContain('data-look="strong"');
  });
});
