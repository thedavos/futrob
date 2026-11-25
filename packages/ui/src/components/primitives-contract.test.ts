import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import { LAYERING_TOKENS } from "@futrob/ui-tokens";

import { z } from "#styles/tokens.stylex";
import { Logo } from "../logo.tsx";
import { BreadcrumbEllipsis } from "./breadcrumb.tsx";
import { Button } from "./button.tsx";
import { Caption } from "./caption/caption.tsx";
import { Stepper } from "./stepper.tsx";
import { Table, TableBody, TableCell, TableRow } from "./table.tsx";
import { Text } from "./text/text.tsx";

describe("Button", () => {
  it("keeps autoComplete=off on native buttons and omits it on link renders", () => {
    const nativeMarkup = renderToStaticMarkup(createElement(Button, null, "Guardar"));
    expect(nativeMarkup).toMatch(/autocomplete="off"/i);

    const linkMarkup = renderToStaticMarkup(
      createElement(Button, { render: createElement("a", { href: "/competitions" }) }, "Ver"),
    );
    expect(linkMarkup.startsWith("<a")).toBe(true);
    expect(linkMarkup).not.toMatch(/autocomplete=/i);
  });
});

describe("BreadcrumbEllipsis", () => {
  it("keeps the screen-reader label outside aria-hidden and hides only the decorative icon", () => {
    const markup = renderToStaticMarkup(createElement(BreadcrumbEllipsis));

    expect(markup).not.toMatch(/<span[^>]*aria-hidden="true"[^>]*>.*Más/);
    expect(markup).toContain("<svg");
    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(markup).toContain(">Más</span>");

    const localized = renderToStaticMarkup(createElement(BreadcrumbEllipsis, { label: "More" }));
    expect(localized).toContain(">More</span>");
  });
});

describe("Stepper", () => {
  it("omits mobileSummary when currentStepId does not match any step", () => {
    const markup = renderToStaticMarkup(
      createElement(Stepper, {
        steps: [
          { id: "info", label: "Información" },
          { id: "format", label: "Formato" },
        ],
      }),
    );

    expect(markup).not.toContain("Paso 0");
  });
});

describe("TextTone tertiary", () => {
  it("exposes tertiary tone on Text and Caption", () => {
    const textMarkup = renderToStaticMarkup(
      createElement(Text, { look: "caption", tone: "tertiary" }, "Hace 2 h"),
    );
    const captionMarkup = renderToStaticMarkup(
      createElement(Caption, { tone: "tertiary" }, "Hace 2 h"),
    );

    expect(textMarkup).toContain('data-tone="tertiary"');
    expect(captionMarkup).toContain('data-tone="tertiary"');
  });
});

describe("Logo", () => {
  it("marks decorative logos aria-hidden and exposes title when provided", () => {
    const decorative = renderToStaticMarkup(createElement(Logo));
    expect(decorative).toContain('data-slot="logo"');
    expect(decorative).toContain('aria-hidden="true"');

    const labelled = renderToStaticMarkup(createElement(Logo, { title: "Futrob" }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain(">Futrob</title>");
  });
});

describe("Table", () => {
  it("exposes role=group on the scroll container when containerLabelledBy is provided", () => {
    const labelledMarkup = renderToStaticMarkup(
      createElement(
        Table,
        { containerLabelledBy: "standings-heading" },
        createElement(
          TableBody,
          null,
          createElement(TableRow, null, createElement(TableCell, null, "Cuervos")),
        ),
      ),
    );
    expect(labelledMarkup).toContain('role="group"');
    expect(labelledMarkup).toContain('aria-labelledby="standings-heading"');

    const unlabelledMarkup = renderToStaticMarkup(
      createElement(
        Table,
        null,
        createElement(
          TableBody,
          null,
          createElement(TableRow, null, createElement(TableCell, null, "Cuervos")),
        ),
      ),
    );
    expect(unlabelledMarkup).not.toContain('role="group"');
  });
});

describe("Layering constants", () => {
  it("keeps StyleX z constants in sync with LAYERING_TOKENS", () => {
    for (const [key, value] of Object.entries(z)) {
      const token = LAYERING_TOKENS[`z-${key}`];
      expect(token, `LAYERING_TOKENS["z-${key}"]`).toBeDefined();
      expect(token?.kind).toBe("raw");
      if (token?.kind === "raw") {
        expect(String(value)).toBe(token.value);
      }
    }
  });
});
