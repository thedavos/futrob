import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { LeadCard } from "./lead-card.tsx";

describe("LeadCard", () => {
  it("renders a card with the primary tone by default", () => {
    const markup = renderToStaticMarkup(
      createElement(LeadCard, { icon: "●", title: "Mis partidos" }),
    );

    expect(markup).toContain('data-slot="card"');
    expect(markup).toContain('data-tone="primary"');
    expect(markup).toContain("Mis partidos");
  });

  it("renders the muted island when requested", () => {
    const markup = renderToStaticMarkup(
      createElement(LeadCard, { icon: "●", title: "Sin invitaciones pendientes", tone: "muted" }),
    );

    expect(markup).toContain('data-tone="muted"');
  });
});
