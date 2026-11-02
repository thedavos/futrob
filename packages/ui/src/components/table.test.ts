import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Table, TableCell, TableHead } from "./table.tsx";

describe("Table", () => {
  it("aligns cells and heads to the start by default", () => {
    expect(renderToStaticMarkup(createElement(TableCell, null, "Fera"))).toContain(
      'data-align="start"',
    );
    expect(renderToStaticMarkup(createElement(TableHead, null, "Equipo"))).toContain(
      'data-align="start"',
    );
  });

  it("marks figure columns as end-aligned on both head and cell", () => {
    expect(renderToStaticMarkup(createElement(TableHead, { align: "end" }, "Pts"))).toContain(
      'data-align="end"',
    );
    expect(renderToStaticMarkup(createElement(TableCell, { align: "end" }, "12"))).toContain(
      'data-align="end"',
    );
  });

  it("opts into a sticky header only when asked", () => {
    expect(renderToStaticMarkup(createElement(Table))).not.toContain("data-sticky-header");
    expect(renderToStaticMarkup(createElement(Table, { stickyHeader: true }))).toContain(
      'data-sticky-header="true"',
    );
  });
});
