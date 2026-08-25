import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { MetaItem, MetaList, MetaTerm, MetaValue } from "./meta-list.tsx";

describe("MetaList", () => {
  it("renders a description list of caption pairs", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MetaList,
        { columns: 2 },
        createElement(
          MetaItem,
          null,
          createElement(MetaTerm, null, "Tipo"),
          createElement(MetaValue, null, "Clubs"),
        ),
      ),
    );

    expect(markup).toContain('data-slot="meta-list"');
    expect(markup).toContain('data-columns="2"');
    expect(markup).toContain('data-slot="meta-term"');
    expect(markup).toContain('data-slot="meta-value"');
    expect(markup).toContain("<dt");
    expect(markup).toContain("<dd");
    expect(markup).toContain("Clubs");
  });
});
