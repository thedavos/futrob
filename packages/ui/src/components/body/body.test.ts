import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Body } from "./body.tsx";

describe("Body", () => {
  it("renders a medium body paragraph by default", () => {
    const markup = renderToStaticMarkup(createElement(Body, null, "Elige el resultado oficial."));

    expect(markup).toContain('data-slot="body"');
    expect(markup).toContain('data-size="md"');
    expect(markup).toContain('data-tone="default"');
    expect(markup.startsWith("<p")).toBe(true);
    expect(markup).not.toContain("data-measure");
  });

  it("can cap the measure and step the size", () => {
    const markup = renderToStaticMarkup(
      createElement(Body, { size: "lg", measure: true, tone: "muted" }, "Lectura holgada"),
    );

    expect(markup).toContain('data-size="lg"');
    expect(markup).toContain('data-measure="true"');
    expect(markup).toContain('data-tone="muted"');
  });
});
