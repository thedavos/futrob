// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { AuditPageRoute, AuditPageView } from "./audit-page.tsx";

const entry = {
  id: "sanction:1",
  organizationId: "org-1",
  competitionId: "competition-1",
  actorId: "actor-organizer",
  actorName: "María Torres",
  action: "sanctions.imposed",
  reason: "Alineación indebida",
  occurredAt: "2026-11-10T12:00:00.000Z",
  requestId: "req-1",
  object: {
    type: "sanction",
    id: "sanction-1",
    label: "Cóndor FC",
    href: "/orgs/org-1/competitions/competition-1/sanctions",
  },
};

function show(state: Parameters<typeof AuditPageView>[0]["state"], filtered = false) {
  const onFilter = vi.fn();
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  render(
    <I18nProvider initialLocale="es">
      <AuditPageView
        organizationId="org-1"
        state={state}
        filters={filtered ? { actorId: "actor-organizer" } : {}}
        onFilter={onFilter}
        onNext={onNext}
        onPrevious={onPrevious}
        canPrevious={false}
      />
    </I18nProvider>,
  );
  return { onFilter, onNext, onPrevious };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("shows actor, action, reason and a link to the affected object without mutation controls", () => {
  show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  expect(screen.getByText("María Torres")).toBeTruthy();
  expect(screen.getByText("Alineación indebida")).toBeTruthy();
  expect(screen.getByText("Sanción impuesta")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Cóndor FC" }).getAttribute("href")).toBe(
    entry.object.href,
  );
  expect(screen.queryByRole("button", { name: /editar|eliminar/i })).toBeNull();
});
it("keeps filters on an empty filtered read and lets the organizer clear them", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({ kind: "ready", data: { entries: [], nextCursor: null } }, true);
  expect(screen.getByText("Sin resultados con estos filtros")).toBeTruthy();
  expect(screen.queryByText("Sin actividad registrada")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
  expect(onFilter).toHaveBeenCalledWith({});
});
it("applies actor, competition, action and full UTC date filters", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  await user.type(screen.getByRole("combobox", { name: "Actor" }), "actor-organizer");
  await user.type(screen.getByRole("combobox", { name: "Competición" }), "competition-1");
  await user.type(screen.getByRole("combobox", { name: "Acción" }), "sanctions.imposed");
  await user.type(screen.getByLabelText("Desde (UTC)"), "2026-11-01");
  await user.type(screen.getByLabelText("Hasta (UTC)"), "2026-11-10");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(onFilter).toHaveBeenCalledWith({
    actorId: "actor-organizer",
    competitionId: "competition-1",
    action: "sanctions.imposed",
    from: "2026-11-01T00:00:00.000Z",
    to: "2026-11-10T23:59:59.999Z",
  });
});
it.each([
  ["authorization.organization-role.changed", "Rol de organización cambiado"],
  ["authorization.grant.created", "Permiso concedido"],
  ["competitions.entry_registered", "Equipo inscrito"],
  ["competitions.entry_approved", "Inscripción aprobada"],
  ["competitions.entry_rejected", "Inscripción rechazada"],
  ["teams.roster_member_added", "Jugador añadido a la plantilla"],
  ["results.confirmation_expired", "Confirmación vencida"],
  ["teams.external_club_connected", "Club asociado"],
  ["game_data.sync_queued", "Sincronización solicitada"],
  ["game_data.sync_completed", "Sincronización completada"],
])("translates the audit action %s", (action, label) => {
  show({ kind: "ready", data: { entries: [{ ...entry, action }], nextCursor: null } });
  expect(screen.getByText(label)).toBeTruthy();
});
it("rejects a reversed date range before applying filters", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  await user.type(screen.getByLabelText("Desde (UTC)"), "2026-11-11");
  await user.type(screen.getByLabelText("Hasta (UTC)"), "2026-11-10");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  expect(screen.getByText("La fecha final debe ser igual o posterior a la inicial.")).toBeTruthy();
  expect(screen.getByLabelText("Hasta (UTC)")).toHaveAttribute("aria-invalid", "true");
  expect(onFilter).not.toHaveBeenCalled();
});
it("keeps cached entries on a refresh error and offers recovery", async () => {
  const user = userEvent.setup();
  const retry = vi.fn();
  show({ kind: "ready", data: { entries: [entry], nextCursor: null }, refreshError: retry });
  expect(screen.getByRole("table", { name: "Historial de auditoría" })).toBeTruthy();
  expect(
    screen.getByText("No pudimos actualizar la auditoría. Ves la última lectura correcta."),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(retry).toHaveBeenCalledOnce();
});
it("offers the next page only when a cursor exists", async () => {
  const user = userEvent.setup();
  const { onNext } = show({ kind: "ready", data: { entries: [entry], nextCursor: "cursor-2" } });
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(onNext).toHaveBeenCalledWith("cursor-2");
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
});
it("distinguishes permission denial from an empty history", () => {
  show({ kind: "denied" });
  expect(screen.getByText("Auditoría no disponible")).toBeTruthy();
  expect(screen.queryByRole("form", { name: "Filtrar auditoría" })).toBeNull();
});

function serveAudit() {
  const calls: URL[] = [];
  let denied = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "https://web.test");
      if (url.pathname === "/api/v1/authorization/effective-access")
        return Response.json({
          actorId: "organizer",
          scope: { organizationId: "org-1" },
          roles: [],
          permissions: [
            {
              permission: ORGANIZATION_PERMISSION.auditTrailRead,
              allowed: true,
              decidedAt: "organization",
            },
          ],
        });
      if (url.pathname === "/api/v1/organizations/org-1/audit") {
        calls.push(url);
        if (denied)
          return Response.json(
            { code: "authorization.forbidden", messageKey: "errors.authorization.forbidden" },
            { status: 403 },
          );
        return Response.json({
          entries: [{ ...entry, id: url.searchParams.get("cursor") ?? "first" }],
          nextCursor: url.searchParams.has("cursor") ? null : "page-2",
        });
      }
      return Response.json(
        { code: "api.not_found", messageKey: "errors.api.not_found" },
        { status: 404 },
      );
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale="es">
        <AuditPageRoute organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return {
    calls,
    client,
    deny: () => {
      denied = true;
    },
  };
}
it("keeps applied filters on the next page and resets pagination when filters change", async () => {
  const user = userEvent.setup();
  const { calls } = serveAudit();
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.type(screen.getByRole("combobox", { name: "Actor" }), "actor-organizer");
  await user.click(screen.getByRole("button", { name: "Aplicar filtros" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  expect(calls.at(-1)?.searchParams.get("actorId")).toBe("actor-organizer");
  expect(calls.at(-1)?.searchParams.get("cursor")).toBe("page-2");
  await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Actor" })).toHaveValue("");
});
it("removes cached entries after a refreshed read returns 403", async () => {
  const { client, deny } = serveAudit();
  await screen.findByRole("table", { name: "Historial de auditoría" });
  deny();
  await act(async () => {
    await client.invalidateQueries({
      queryKey: queryKeys.organizations.audit("org-1", {}).slice(0, 3),
    });
  });
  expect(await screen.findByText("Auditoría no disponible")).toBeTruthy();
  expect(screen.queryByText("María Torres")).toBeNull();
});
