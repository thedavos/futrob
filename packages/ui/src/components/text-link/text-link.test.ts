import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { TextLink } from "./text-link.tsx";

describe("TextLink", () => {
  it("renders a body text link", () => {
    const markup = renderToStaticMarkup(
      createElement(TextLink, { href: "/espacio" }, "Volver al espacio personal"),
    );

    expect(markup).toContain('data-slot="text-link"');
    expect(markup).toContain('data-text="body"');
    expect(markup).toContain('href="/espacio"');
    expect(markup.startsWith("<a")).toBe(true);
  });

  it("can use the caption role", () => {
    const markup = renderToStaticMarkup(
      createElement(TextLink, { href: "/docs", text: "caption" }, "Leer la guía"),
    );

    expect(markup).toContain('data-text="caption"');
  });

  it("can mark a disabled destination", () => {
    const markup = renderToStaticMarkup(
      createElement(TextLink, { href: "/espacio", "aria-disabled": true }, "No disponible"),
    );

    expect(markup).toContain('aria-disabled="true"');
  });
});
