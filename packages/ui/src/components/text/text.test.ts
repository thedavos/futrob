import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Text } from "./text.tsx";

describe("Text", () => {
  it("renders inline body text by default", () => {
    const markup = renderToStaticMarkup(createElement(Text, null, "Clubs"));

    expect(markup).toContain('data-slot="text"');
    expect(markup).toContain('data-look="body"');
    expect(markup.startsWith("<span")).toBe(true);
  });

  it("can change look, weight and element", () => {
    const markup = renderToStaticMarkup(
      createElement(Text, { as: "strong", look: "label", weight: "semibold" }, "Oficial"),
    );

    expect(markup.startsWith("<strong")).toBe(true);
    expect(markup).toContain('data-look="label"');
    expect(markup).toContain('data-weight="semibold"');
  });

  it("exposes the full string when truncated", () => {
    const markup = renderToStaticMarkup(
      createElement(Text, { truncate: true }, "Un valor demasiado largo"),
    );

    expect(markup).toContain('data-truncate="true"');
    expect(markup).toContain('title="Un valor demasiado largo"');
  });
});
