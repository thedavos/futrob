// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import type { AuditFilterOption, AuditFilters } from "./audit-filters.tsx";
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

type ViewState = Parameters<typeof AuditPageView>[0]["state"];

function show(
  state: ViewState,
  options?: {
    readonly filters?: AuditFilters;
    readonly competitionId?: string;
    readonly actorOptions?: readonly AuditFilterOption[];
    readonly competitionOptions?: readonly AuditFilterOption[];
  },
) {
  const onFilter = vi.fn();
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  const filters = options?.filters ?? {};
  const view = (next: ViewState, nextFilters = filters) => (
    <AuditPageView
      actorOptions={options?.actorOptions}
      canPrevious={false}
      competitionId={options?.competitionId}
      competitionOptions={options?.competitionOptions}
      filters={nextFilters}
      onFilter={onFilter}
      onNext={onNext}
      onPrevious={onPrevious}
      organizationId="org-1"
      state={next}
    />
  );
  const result = render(view(state), {
    wrapper: ({ children }) => <I18nProvider initialLocale="es">{children}</I18nProvider>,
  });
  return {
    onFilter,
    onNext,
    onPrevious,
    renderState: (next: ViewState, nextFilters = filters) =>
      result.rerender(view(next, nextFilters)),
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows actor, action, reason and a link to the affected object without raw UUID noise or mutation controls", () => {
  show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  const table = screen.getByRole("table", { name: "Historial de auditoría" });
  expect(within(table).getByText("María Torres")).toBeTruthy();
  expect(within(table).getByText("Alineación indebida")).toBeTruthy();
  expect(within(table).getByText("Sanción impuesta")).toBeTruthy();
  expect(within(table).queryByText("actor-organizer")).toBeNull();
  expect(within(table).queryByText("Correlación req-1")).toBeNull();
  expect(within(table).getByRole("link", { name: "Cóndor FC" }).getAttribute("href")).toBe(
    entry.object.href,
  );
  expect(screen.queryByRole("button", { name: /editar|eliminar/i })).toBeNull();
});

it("renders a subtle dash instead of repeating no-reason text in the table and reveals full forensic metadata in the detail sheet", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({
    kind: "ready",
    data: {
      entries: [
        entry,
        {
          ...entry,
          id: "entry:2",
          action: "competitions.entry_approved",
          reason: null,
          requestId: null,
        },
      ],
      nextCursor: null,
    },
  });
  const table = screen.getByRole("table", { name: "Historial de auditoría" });
  expect(within(table).getByLabelText("Sin motivo registrado")).toHaveTextContent("—");

  await user.click(within(table).getByRole("button", { name: "Ver detalle de Sanción impuesta" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Alineación indebida")).toBeTruthy();
  expect(within(dialog).getByText("actor-organizer")).toBeTruthy();
  expect(within(dialog).getByText("req-1")).toBeTruthy();
  expect(within(dialog).getByText("sanctions.imposed")).toBeTruthy();

  await user.click(within(dialog).getByRole("button", { name: "Filtrar por este actor" }));
  expect(onFilter).toHaveBeenCalledWith({ actorId: "actor-organizer" });
});

it("omits the redundant competition overview tab on the competition audit screen", () => {
  show(
    { kind: "ready", data: { entries: [entry], nextCursor: null } },
    { competitionId: "competition-1" },
  );
  expect(screen.queryByRole("navigation", { name: "Vistas de la competición" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Resumen" })).toBeNull();
  expect(screen.queryByRole("combobox", { name: "Competición" })).toBeNull();
});

it("keeps filters on an empty filtered read and lets the organizer clear them", async () => {
  const user = userEvent.setup();
  const { onFilter } = show(
    { kind: "ready", data: { entries: [], nextCursor: null } },
    { filters: { actorId: "actor-organizer" } },
  );
  expect(screen.getByText("Sin resultados con estos filtros")).toBeTruthy();
  expect(screen.queryByText("Sin actividad registrada")).toBeNull();
  const clearButtons = screen.getAllByRole("button", { name: "Quitar filtros" });
  await user.click(clearButtons[0]!);
  expect(onFilter).toHaveBeenCalledWith({});
});

it("applies competition, action, actor and full UTC date filters", async () => {
  const user = userEvent.setup();
  const { onFilter } = show(
    { kind: "ready", data: { entries: [entry], nextCursor: null } },
    {
      actorOptions: [{ id: "actor-organizer", label: "María Torres" }],
      competitionOptions: [{ id: "competition-1", label: "Torneo Verano 25" }],
    },
  );

  await user.click(screen.getByRole("combobox", { name: "Competición" }));
  await user.click(await screen.findByRole("option", { name: "Torneo Verano 25" }));
  expect(onFilter).toHaveBeenLastCalledWith({ competitionId: "competition-1" });

  await user.click(screen.getByRole("combobox", { name: "Acción" }));
  await user.click(await screen.findByRole("option", { name: "Sanción impuesta" }));
  expect(onFilter).toHaveBeenLastCalledWith({ action: "sanctions.imposed" });

  await user.click(screen.getByRole("combobox", { name: "Actor" }));
  await user.click(await screen.findByRole("option", { name: "María Torres" }));
  expect(onFilter).toHaveBeenLastCalledWith({ actorId: "actor-organizer" });

  await user.click(screen.getByRole("button", { name: "Fechas" }));
  await user.type(await screen.findByLabelText("Desde (UTC)"), "2026-11-01");
  await user.type(screen.getByLabelText("Hasta (UTC)"), "2026-11-10");
  await user.click(screen.getByRole("button", { name: "Aplicar rango" }));
  expect(onFilter).toHaveBeenLastCalledWith({
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
  const table = screen.getByRole("table", { name: "Historial de auditoría" });
  expect(within(table).getByText(label)).toBeTruthy();
});

it("filters by an exact actor ID that is neither a member nor on the current page", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  await user.click(screen.getByRole("combobox", { name: "Actor" }));
  await user.click(await screen.findByRole("option", { name: "Otro actor por ID…" }));
  await user.type(screen.getByRole("textbox", { name: "ID del actor" }), " actor-former {Enter}");
  expect(onFilter).toHaveBeenLastCalledWith({ actorId: "actor-former" });
});

it("offers competition-scoped permission changes in the competition audit action filter", async () => {
  const user = userEvent.setup();
  const { onFilter } = show(
    { kind: "ready", data: { entries: [entry], nextCursor: null } },
    { competitionId: "competition-1" },
  );
  await user.click(screen.getByRole("combobox", { name: "Acción" }));
  const granted = await screen.findByRole("option", { name: "Permiso concedido" });
  expect(screen.queryByRole("option", { name: "Rol de organización cambiado" })).toBeNull();
  await user.click(granted);
  expect(onFilter).toHaveBeenLastCalledWith({ action: "authorization.grant.created" });
});

it("rejects a reversed date range inside the date popover before applying filters", async () => {
  const user = userEvent.setup();
  const { onFilter } = show({ kind: "ready", data: { entries: [entry], nextCursor: null } });
  await user.click(screen.getByRole("button", { name: "Fechas" }));
  await user.type(await screen.findByLabelText("Desde (UTC)"), "2026-11-11");
  await user.type(screen.getByLabelText("Hasta (UTC)"), "2026-11-10");
  await user.click(screen.getByRole("button", { name: "Aplicar rango" }));
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

it("distinguishes permission denial from an empty history and provides a safe exit link", () => {
  show({ kind: "denied" }, { competitionId: "competition-1" });
  expect(screen.getByText("Auditoría no disponible")).toBeTruthy();
  expect(screen.queryByRole("form", { name: "Filtrar auditoría" })).toBeNull();
  expect(screen.getByRole("link", { name: "Volver al resumen" }).getAttribute("href")).toBe(
    "/orgs/org-1/competitions/competition-1",
  );
});

it("mirrors the audit table while loading without exposing fake rows or putting the scroller in the tab order", () => {
  show({ kind: "loading" });
  const status = screen.getByRole("status", { name: "Cargando auditoría" });
  expect(status.closest("[aria-busy='true']")).toBeNull();
  const busy = document.querySelector<HTMLElement>("[aria-busy='true']");
  expect(busy?.getAttribute("aria-label")).toBe("Cargando auditoría");
  expect(screen.queryByRole("table", { name: "Historial de auditoría" })).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  const skeleton = within(busy!);
  expect(skeleton.getByText("Fecha")).toBeTruthy();
  expect(skeleton.getByText("Acción")).toBeTruthy();
  expect(skeleton.getByText("Actor")).toBeTruthy();
  expect(skeleton.getByText("Objeto afectado")).toBeTruthy();
  expect(skeleton.getByText("Motivo")).toBeTruthy();
  expect(screen.getByRole("form", { name: "Filtrar auditoría" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  expect(document.querySelector("[data-slot='table-container']")?.getAttribute("tabindex")).toBe(
    "-1",
  );
});

it("announces a filter refetch on the same live region outside the busy skeleton", () => {
  const ready = { kind: "ready" as const, data: { entries: [entry], nextCursor: null } };
  const { renderState } = show(ready);
  const status = screen.getByRole("status");
  expect(status.getAttribute("aria-label")).toBeNull();
  expect(status.closest("[aria-busy='true']")).toBeNull();
  renderState({ kind: "loading" });
  expect(status.getAttribute("aria-label")).toBe("Cargando auditoría");
  expect(status.closest("[aria-busy='true']")).toBeNull();
  expect(document.querySelector("[aria-busy='true']")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Historial de auditoría" })).toBeNull();
  renderState(ready);
  expect(status.getAttribute("aria-label")).toBeNull();
  const table = screen.getByRole("table", { name: "Historial de auditoría" });
  expect(within(table).getByText("María Torres")).toBeTruthy();
});

function serveAudit(options?: {
  readonly deniedCompetitionId?: string;
  readonly seed?: (client: QueryClient) => void;
}) {
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
        if (
          denied ||
          (options?.deniedCompetitionId &&
            url.searchParams.get("competitionId") === options.deniedCompetitionId)
        )
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  options?.seed?.(client);
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

it("lets the reader leave a competition filter whose audit is denied and reloads the global history", async () => {
  const user = userEvent.setup();
  const { calls } = serveAudit({
    deniedCompetitionId: "competition-2",
    seed: (client) =>
      client.setQueryData(queryKeys.competitions.byOrganization("org-1"), {
        competitions: [{ id: "competition-2", name: "Copa Invierno" }],
      }),
  });
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.click(screen.getByRole("combobox", { name: "Competición" }));
  await user.click(await screen.findByRole("option", { name: "Copa Invierno" }));
  expect(await screen.findByText("Sin acceso a esta competición")).toBeTruthy();
  expect(screen.getByRole("form", { name: "Filtrar auditoría" })).toBeTruthy();
  const deniedCalls = calls.length;
  await user.click(screen.getByRole("button", { name: "Ver todas las competiciones" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  expect(screen.getByRole("combobox", { name: "Competición" })).toHaveTextContent(
    "Todas las competiciones",
  );
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  expect(calls.slice(deniedCalls).some((call) => call.searchParams.has("competitionId"))).toBe(
    false,
  );
});

it("does not offer cached member data once membership read access is gone", async () => {
  const user = userEvent.setup();
  serveAudit({
    seed: (client) =>
      client.setQueryData(queryKeys.organizations.members("org-1"), {
        kind: "data",
        members: [{ actorId: "actor-hidden", displayName: null, email: "ana@club.test" }],
      }),
  });
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.click(screen.getByRole("combobox", { name: "Actor" }));
  expect(await screen.findByRole("option", { name: "María Torres" })).toBeTruthy();
  expect(screen.queryByRole("option", { name: "ana@club.test" })).toBeNull();
});

it("keeps applied filters on the next page and resets pagination when filters change", async () => {
  const user = userEvent.setup();
  const { calls } = serveAudit();
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.click(screen.getByRole("combobox", { name: "Actor" }));
  await user.click(await screen.findByRole("option", { name: "María Torres" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  expect(calls.at(-1)?.searchParams.get("actorId")).toBe("actor-organizer");
  expect(calls.at(-1)?.searchParams.get("cursor")).toBe("page-2");
  await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
  await screen.findByRole("table", { name: "Historial de auditoría" });
  expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Actor" })).toHaveTextContent("Todos los actores");
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
