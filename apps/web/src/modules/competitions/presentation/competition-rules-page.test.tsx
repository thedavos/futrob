// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { CompetitionDraftDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { leagueDraft, leaguePlayoffsDraft, publishedDraft } from "./competition-rules-fixtures.ts";
import { CompetitionRulesRoute } from "./competition-rules-page.tsx";

const permission = vi.hoisted(() => ({ allowed: true }));

vi.mock("@/shared/presentation/permissions/index.ts", () => ({
  useCan: () => ({ allowed: permission.allowed, loading: false, unavailable: false }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params: Record<string, string>;
    search?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      href={`${to.replaceAll(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""))}${search ? `?step=${search.step}` : ""}`}
      {...props}
    >
      {children}
    </a>
  ),
}));

const DRAFT_PATH = "/api/v1/organizations/org-1/competitions/competition-1";

function serve(...responses: Array<() => Response>) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    if (url.pathname !== DRAFT_PATH) return failure(404, "api.not_found");
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return next ? next() : failure(500, "api.unexpected");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });
const draft = (value: CompetitionDraftDto) => () => Response.json(value);

function renderRoute(locale: "es" | "en" = "es") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <CompetitionRulesRoute competitionId="competition-1" organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  permission.allowed = true;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition rules page", () => {
  it("reads the persisted draft rules per stage and links a draft to its setup", async () => {
    serve(draft(leaguePlayoffsDraft));
    renderRoute();

    expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Reglamento" })).toBeTruthy();
    expect(screen.getByText("De 4 a 16")).toBeTruthy();
    const playoffs = screen.getByRole("heading", { name: "Playoffs" }).closest("section")!;
    expect(within(playoffs).getByText("2 partidos")).toBeTruthy();
    expect(within(playoffs).getByText("Marcador agregado")).toBeTruthy();
    expect(within(playoffs).getByText("Sin límite")).toBeTruthy();
    expect(within(playoffs).getByText("6 horas")).toBeTruthy();
    const league = screen.getByRole("heading", { name: "Liga" }).closest("section")!;
    expect(within(league).getByText("1 partido")).toBeTruthy();
    expect(within(league).getByText("24 horas")).toBeTruthy();
    expect(screen.getByText("11 jugadores")).toBeTruthy();
    const edit = screen.getByRole("button", {
      name: "Editar reglas",
    });
    expect(edit.getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/setup?step=rules",
    );
  });

  it("offers no edit link without update access", async () => {
    permission.allowed = false;
    serve(draft(leaguePlayoffsDraft));
    renderRoute();

    await screen.findByText("Liga + playoffs");
    expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  });

  it("shows a published competition's rules read-only, even for an editor", async () => {
    serve(draft(publishedDraft));
    renderRoute();

    expect(await screen.findByText(/solo lectura/)).toBeTruthy();
    expect(screen.getByText("Publicada")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  });

  it("hides rescheduling details when it is disabled and uses the default roster limit", async () => {
    serve(draft(leagueDraft));
    renderRoute();

    expect(await screen.findByText("No se permiten reprogramaciones")).toBeTruthy();
    expect(screen.queryByText("Aviso mínimo")).toBeNull();
    expect(screen.getByText("11 (tope por defecto)")).toBeTruthy();
    expect(screen.getByText("Desde 4")).toBeTruthy();
  });

  it("speaks English when the session locale is English", async () => {
    serve(draft(leaguePlayoffsDraft));
    renderRoute("en");

    expect(await screen.findByText("4 to 16")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Rules" })).toBeTruthy();
    expect(screen.getByText("4 to 16")).toBeTruthy();
    expect(screen.getByText("Goal difference")).toBeTruthy();
  });

  it("explains a refused read instead of an empty page", async () => {
    serve(() => failure(403, "authorization.forbidden"));
    renderRoute();

    expect(await screen.findByText("No tienes acceso al reglamento")).toBeTruthy();
    expect(screen.queryByText("Puntuación")).toBeNull();
  });

  it("reports a missing competition as not found", async () => {
    serve(() => failure(404, "competitions.not_found"));
    renderRoute();

    expect(await screen.findByText("No encontramos esta competición")).toBeTruthy();
  });

  it("offers a retry after a failed load and recovers", async () => {
    const fetch = serve(() => failure(500, "api.unexpected"), draft(leaguePlayoffsDraft));
    renderRoute();

    expect(await screen.findByText("No pudimos cargar el reglamento.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never resurrects cached rules once a refresh is refused", async () => {
    for (const status of [401, 403, 404]) {
      cleanup();
      serve(draft(leaguePlayoffsDraft), () => failure(status, "authorization.forbidden"));
      const queryClient = renderRoute();
      expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
      await queryClient.refetchQueries();
      await waitFor(() => expect(screen.queryByText("Liga + playoffs")).toBeNull());
      expect(screen.queryByText("Puntuación")).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
    }
  });

  it("keeps cached rules with an explicit retry when a refresh fails transiently", async () => {
    serve(draft(leaguePlayoffsDraft), () => failure(500, "api.unexpected"), draft(leagueDraft));
    const queryClient = renderRoute();
    expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
    await queryClient.refetchQueries();

    expect(await screen.findByText(/No pudimos actualizar el reglamento/)).toBeTruthy();
    expect(screen.getByText("Liga + playoffs")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByText(/No pudimos actualizar/)).toBeNull());
    expect(screen.getByText("Desde 4")).toBeTruthy();
  });

  it("keeps a refusal authoritative through later transient errors until a fresh success", async () => {
    for (const status of [401, 403, 404]) {
      cleanup();
      serve(
        draft(leaguePlayoffsDraft),
        () => failure(status, "authorization.forbidden"),
        () => failure(500, "api.unexpected"),
        () => failure(500, "api.unexpected"),
        draft(leagueDraft),
      );
      const queryClient = renderRoute();
      expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
      await queryClient.refetchQueries();
      await waitFor(() => expect(screen.queryByText("Liga + playoffs")).toBeNull());
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await queryClient.refetchQueries();
        await waitFor(() => expect(queryClient.isFetching()).toBe(0));
        expect(screen.queryByText("Liga + playoffs")).toBeNull();
        expect(screen.queryByText("Puntuación")).toBeNull();
        expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
      }
      await queryClient.refetchQueries();
      expect(await screen.findByText("Desde 4")).toBeTruthy();
      expect(screen.queryByText(/No pudimos actualizar/)).toBeNull();
    }
  });

  it("keeps a refusal through a transient error and a remount within the cache lifetime", async () => {
    const refusals = [
      { status: 401, title: "No tienes acceso al reglamento" },
      { status: 403, title: "No tienes acceso al reglamento" },
      { status: 404, title: "No encontramos esta competición" },
    ];
    for (const { status, title } of refusals) {
      cleanup();
      serve(
        draft(leaguePlayoffsDraft),
        () => failure(status, "authorization.forbidden"),
        () => failure(500, "api.unexpected"),
      );
      const queryClient = renderRoute();
      expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
      await queryClient.refetchQueries();
      expect(await screen.findByText(title)).toBeTruthy();
      await queryClient.refetchQueries();
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
      expect(screen.getByText(title)).toBeTruthy();

      cleanup();
      render(
        <QueryClientProvider client={queryClient}>
          <I18nProvider initialLocale="es">
            <CompetitionRulesRoute competitionId="competition-1" organizationId="org-1" />
          </I18nProvider>
        </QueryClientProvider>,
      );
      await waitFor(() => expect(queryClient.isFetching()).toBe(0));
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.queryByText("Liga + playoffs")).toBeNull();
      expect(screen.queryByText("Puntuación")).toBeNull();
      expect(screen.queryByText(/No pudimos actualizar/)).toBeNull();
      expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
    }
  });

  it("isolates a refusal to its own organization", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input), "https://web.test").pathname;
        return path.startsWith("/api/v1/organizations/org-2/")
          ? failure(403, "authorization.forbidden")
          : draft(leagueDraft)();
      }),
    );
    const view = (organizationId: string) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLocale="es">
          <CompetitionRulesRoute competitionId="competition-1" organizationId={organizationId} />
        </I18nProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(view("org-2"));
    expect(await screen.findByText("No tienes acceso al reglamento")).toBeTruthy();
    rerender(view("org-1"));
    expect(await screen.findByText("Desde 4")).toBeTruthy();
    expect(screen.queryByText("No tienes acceso al reglamento")).toBeNull();
  });

  it("isolates a refusal to its own scope", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const other = "/api/v1/organizations/org-1/competitions/competition-2";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = new URL(String(input), "https://web.test").pathname;
        return path === other ? failure(403, "authorization.forbidden") : draft(leagueDraft)();
      }),
    );
    const view = (competitionId: string) => (
      <QueryClientProvider client={queryClient}>
        <I18nProvider initialLocale="es">
          <CompetitionRulesRoute competitionId={competitionId} organizationId="org-1" />
        </I18nProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(view("competition-2"));
    expect(await screen.findByText("No tienes acceso al reglamento")).toBeTruthy();
    rerender(view("competition-1"));
    expect(await screen.findByText("Desde 4")).toBeTruthy();
    expect(screen.queryByText("No tienes acceso al reglamento")).toBeNull();
  });

  it("shows a retryable notice, not rules, for a first load that fails and no refusal", async () => {
    serve(() => failure(500, "api.unexpected"));
    renderRoute();

    expect(await screen.findByText("No pudimos cargar el reglamento.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  });

  it("gates editing after a transient refresh error on cached published rules", async () => {
    serve(draft(publishedDraft), () => failure(500, "api.unexpected"));
    const queryClient = renderRoute();
    expect(await screen.findByText(/solo lectura/)).toBeTruthy();
    await queryClient.refetchQueries();

    expect(await screen.findByText(/No pudimos actualizar el reglamento/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  });

  it("keeps the edit action for cached draft rules after a transient refresh error", async () => {
    serve(draft(leaguePlayoffsDraft), () => failure(500, "api.unexpected"));
    const queryClient = renderRoute();
    expect(await screen.findByText("Liga + playoffs")).toBeTruthy();
    await queryClient.refetchQueries();

    expect(await screen.findByText(/No pudimos actualizar el reglamento/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar reglas" })).toBeTruthy();
  });
});
