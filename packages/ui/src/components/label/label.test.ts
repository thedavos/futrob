import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Label } from "./label.tsx";

describe("Label", () => {
  it("renders a form label with the label slot", () => {
    const markup = renderToStaticMarkup(
      createElement(Label, { htmlFor: "competition-name" }, "Nombre"),
    );

    expect(markup).toContain('data-slot="label"');
    expect(markup).toContain('for="competition-name"');
    expect(markup.startsWith("<label")).toBe(true);
  });
});
