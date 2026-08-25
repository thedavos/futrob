import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Display } from "./display.tsx";

describe("Display", () => {
  it("renders an h1 marketing headline by default", () => {
    const markup = renderToStaticMarkup(createElement(Display, null, "Competiciones claras"));

    expect(markup).toContain('data-slot="display"');
    expect(markup.startsWith("<h1")).toBe(true);
  });
});
