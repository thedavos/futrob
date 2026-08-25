import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "./page-header.tsx";

describe("PageHeader", () => {
  it("renders the product h1 with heading look", () => {
    const markup = renderToStaticMarkup(
      createElement(
        PageHeader,
        null,
        createElement(PageHeaderEyebrow, null, "Espacio personal"),
        createElement(PageHeaderTitle, null, "Mis partidos"),
        createElement(PageHeaderDescription, null, "Apariciones en el club seleccionado."),
      ),
    );

    expect(markup).toContain('data-slot="page-header"');
    expect(markup).toContain('data-slot="page-header-eyebrow"');
    expect(markup).toContain('data-slot="page-header-title"');
    expect(markup).toContain('data-slot="page-header-description"');
    expect(markup).toContain("<h1");
  });

  it("steps the title size for landing-style product homes", () => {
    const markup = renderToStaticMarkup(
      createElement(PageHeaderTitle, { size: "lg" }, "Tu espacio de jugador"),
    );

    expect(markup).toContain('data-size="lg"');
  });

  it("exposes the full title when truncated", () => {
    const markup = renderToStaticMarkup(
      createElement(PageHeaderTitle, { truncate: true }, "Un título muy largo"),
    );

    expect(markup).toContain('data-truncate="true"');
    expect(markup).toContain('title="Un título muy largo"');
  });
});
