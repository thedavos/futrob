import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Text } from "./text.tsx";

describe("Text", () => {
  it("exposes the full string when truncated", () => {
    const markup = renderToStaticMarkup(
      createElement(Text, { truncate: true }, "Un valor demasiado largo"),
    );

    expect(markup).toContain('data-truncate="true"');
    expect(markup).toContain('title="Un valor demasiado largo"');
  });
});
