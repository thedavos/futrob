import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { PageHeaderTitle } from "./page-header.tsx";

describe("PageHeader", () => {
  it("exposes the full title when truncated", () => {
    const markup = renderToStaticMarkup(
      createElement(PageHeaderTitle, { truncate: true }, "Un título muy largo"),
    );

    expect(markup).toContain('data-truncate="true"');
    expect(markup).toContain('title="Un título muy largo"');
  });
});
