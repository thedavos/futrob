// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OrganizationMembersSections } from "./organization-members-sections.tsx";
import { MEMBERS_FIXTURE, MEMBERS_ACCESS_FIXTURE } from "./organization-members-page.fixtures.ts";
import type { MembersSectionState, OrganizationMemberView } from "./organization-members-model.ts";

afterEach(cleanup);
function sections(members: MembersSectionState<OrganizationMemberView>) {
  return (
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <OrganizationMembersSections members={members} changes={{ kind: "unavailable" }} />
    </I18nProvider>
  );
}
const ready = { kind: "data" as const, items: MEMBERS_FIXTURE, refresh: { kind: "idle" as const } };

describe("member selection", () => {
  it("clears filtered detail immediately and does not restore it when the filter clears", () => {
    render(sections(ready));
    fireEvent.click(screen.getByRole("row", { name: /Lucía Pérez/ }));
    const detail = within(screen.getByRole("region", { name: "Detalle del miembro" }));
    expect(detail.getByRole("heading", { name: "Lucía Pérez" })).toBeVisible();
    const search = screen.getByRole("textbox", { name: "Buscar miembros" });
    fireEvent.change(search, { target: { value: "Ana" } });
    expect(detail.queryByRole("heading", { name: "Lucía Pérez" })).toBeNull();
    fireEvent.change(search, { target: { value: "" } });
    expect(detail.getByRole("heading", { name: "Selecciona un miembro" })).toBeVisible();
  });

  it("clears detail when authorization is lost and keeps it cleared after data returns", () => {
    const view = render(sections(ready));
    fireEvent.keyDown(screen.getByRole("row", { name: /Lucía Pérez/ }), { key: "Enter" });
    view.rerender(sections({ kind: "denied" }));
    expect(screen.queryByText("lucia@example.com")).toBeNull();
    view.rerender(sections(ready));
    expect(screen.getByRole("heading", { name: "Selecciona un miembro" })).toBeVisible();
  });
  it("renders restrictions, denied read bits, null roles and vice captain honestly", () => {
    render(sections({ ...ready, items: MEMBERS_ACCESS_FIXTURE }));
    expect(
      within(screen.getByRole("row", { name: /Marcos Díaz/ })).getByText(
        /^Acceso heredado con restricciones: Copa restringida \(Sin permiso de lectura\)/,
      ),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("row", { name: /Marcos Díaz/ }));
    const detail = within(screen.getByRole("region", { name: "Detalle del miembro" }));
    expect(detail.getByText("Acceso heredado con restricciones")).toBeVisible();
    expect(detail.getByText("Sin permiso de lectura")).toBeVisible();
    expect(detail.getByText("Acceso autorizado")).toBeVisible();
    expect(detail.getByText("Subcapitán")).toBeVisible();
    expect(detail.queryByText("Todas las competiciones")).toBeNull();
  });

  it("keeps an inherited restriction explicit when no competition names are visible", () => {
    const restricted = {
      ...MEMBERS_FIXTURE[0]!,
      access: { kind: "inherited-with-restriction" as const, competitions: [] },
    };
    render(sections({ ...ready, items: [restricted] }));
    fireEvent.click(screen.getByRole("row", { name: /Ana Torres/ }));
    const detail = within(screen.getByRole("region", { name: "Detalle del miembro" }));
    expect(detail.getByText("Acceso heredado con restricciones")).toBeVisible();
    expect(detail.getByText("No hay competiciones visibles para mostrar")).toBeVisible();
    expect(detail.queryByText("Todas las competiciones")).toBeNull();
  });
});
