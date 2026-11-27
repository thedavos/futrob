// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { EncounterViewDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView, m1, m2, readyCandidates } from "./encounter-page.fixtures.ts";
import { EncounterRoute } from "./encounter-route.tsx";
import { pendingSelection, rejectionReason, reviewCase } from "./official-selection.fixtures.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const ANSWERS = ["confirm", "reject", "propose_alternative", "open_dispute"] as const;
const ENCOUNTERS: Record<string, EncounterViewDto> = {
  "encounter-1": encounterView(),
  "encounter-2": encounterView({
    encounterId: "encounter-2",
    home: { ...encounterView().home, name: "Halcones FC" },
  }),
};

/**
 * Stands in for the BFF for two Encounters of one competition. The actor speaks for
 * both Teams and approves results; `reject` answers each Encounter's reject command.
 */
function serve(
  reject: Record<string, () => Response> = {},
  detail: { fails: boolean } = { fails: false },
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "https://web.test");
      const method = init?.method ?? "GET";
      if (url.pathname === "/api/v1/authorization/effective-access") {
        const permission = url.searchParams.get("permissions") ?? "";
        return Response.json({
          actorId: "actor-1",
          scope: { organizationId: "org-1" },
          roles: [],
          permissions: [{ permission, allowed: true, decidedAt: "organization" }],
        });
      }
      const product = /^\/api\/v1\/organizations\/org-1\/encounters\/([^/]+)(\/.*)?$/.exec(
        url.pathname,
      );
      const bff = /^\/api\/v1\/encounters\/([^/]+)\/(candidates|schedule-change-requests)$/.exec(
        url.pathname,
      );
      if (bff) {
        return bff[2] === "candidates"
          ? Response.json(readyCandidates([m1, m2]))
          : Response.json({ requests: [] });
      }
      const encounterId = product?.[1] ?? "";
      const rest = product?.[2] ?? "";
      if (!product || !ENCOUNTERS[encounterId]) return failure(404, "api.not_found");
      if (rest === "") {
        return detail.fails
          ? failure(503, "api.unavailable")
          : Response.json(ENCOUNTERS[encounterId]);
      }
      if (rest === "/official-selection" && method === "GET") {
        const team = url.searchParams.get("actingTeamId");
        return Response.json(teamView(team));
      }
      if (rest === "/official-selection/disputes" && method === "GET") {
        return Response.json(reviewCase());
      }
      if (rest === "/official-selection/proposals/proposal-1/reject" && method === "POST") {
        return reject[encounterId]?.() ?? failure(404, "api.not_found");
      }
      return failure(404, "api.not_found");
    }),
  );
}

const teamView = (team: string | null): OfficialSelectionViewDto =>
  team === "team-away" ? pendingSelection([...ANSWERS]) : pendingSelection(["open_dispute"]);

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

const TEAM = "Selección oficial";
const REVIEW = "Revisión de la organización";
const team = () => within(screen.getByRole("region", { name: TEAM }));
const review = () => within(screen.getByRole("region", { name: REVIEW }));
const findReview = async () => within(await screen.findByRole("region", { name: REVIEW }));

function renderRoute() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  });
  const ui = (encounterId: string) => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        <EncounterRoute
          competitionId="competition-1"
          encounterId={encounterId}
          organizationId="org-1"
        />
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(ui("encounter-2"));
  return { navigate: (encounterId: string) => view.rerender(ui(encounterId)) };
}

const A = "Cuervos FC vs Maderas FC";
const B = "Halcones FC vs Maderas FC";
const heading = (name: string) => screen.findByRole("heading", { level: 1, name });

/** Visits B first so its reads are cached, as after a client-side visit, then opens A. */
async function openAWithBCached(user: UserEvent) {
  const route = renderRoute();
  await heading(B);
  await (await findReview()).findByRole("button", { name: "Devolver a selección" });
  await user.click(screen.getByRole("tab", { name: /^Selección y candidatos EA/ }));
  await team().findByRole("radiogroup", { name: "Actúas por" });
  route.navigate("encounter-1");
  await heading(A);
  return route;
}

const dialog = (name: string) => within(screen.getByRole("dialog", { name }));
const reason = (name: string) =>
  dialog(name).getByRole<HTMLTextAreaElement>("textbox", { name: "Motivo" });

async function openSelectionTab(user: UserEvent) {
  await user.click(await screen.findByRole("tab", { name: /^Selección y candidatos EA/ }));
}

async function openReviewTab(user: UserEvent) {
  await user.click(await screen.findByRole("tab", { name: /^Expediente/ }));
}

async function actAsAway(user: UserEvent) {
  await openSelectionTab(user);
  const actingAs = await within(await screen.findByRole("region", { name: TEAM })).findByRole(
    "radiogroup",
    { name: "Actúas por" },
  );
  await user.click(within(actingAs).getByRole("radio", { name: "Maderas FC" }));
  return team().findByRole("button", { name: "Rechazar" });
}

async function typeAndClose(user: UserEvent, trigger: HTMLElement, name: string, text: string) {
  await user.click(trigger);
  await user.type(reason(name), text);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Match Center navigation between Encounters", () => {
  it("starts Encounter B with clean Team and operator drafts after typing reasons in A", async () => {
    const user = userEvent.setup();
    serve();
    const { navigate } = await openAWithBCached(user);

    await typeAndClose(user, await actAsAway(user), "Rechazar la propuesta", "Motivo de A");
    await user.click(
      within(
        await screen.findByRole("listitem", { name: /^Cuervos EA contra Maderas EA/ }),
      ).getByRole("button", { name: "Usar en partido 1" }),
    );
    expect(
      within(screen.getByRole("listitem", { name: "Partido 1" })).getByText("1–0"),
    ).toBeTruthy();
    await openReviewTab(user);
    await typeAndClose(
      user,
      await review().findByRole("button", { name: "Devolver a selección" }),
      "Devolver el caso a selección",
      "Devolución de A",
    );

    navigate("encounter-2");

    expect(await heading(B)).toBeTruthy();
    await openSelectionTab(user);
    const actingAs = await team().findByRole("radiogroup", { name: "Actúas por" });
    expect(
      within(actingAs).getByRole("radio", { name: "Halcones FC" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      within(screen.getByRole("listitem", { name: "Partido 1" })).getByText(
        "Sin partido EA asignado",
      ),
    ).toBeTruthy();
    await user.click(await actAsAway(user));
    expect(reason("Rechazar la propuesta").value).toBe("");
    await user.keyboard("{Escape}");
    await openReviewTab(user);
    await user.click(await review().findByRole("button", { name: "Devolver a selección" }));
    expect(reason("Devolver el caso a selección").value).toBe("");
  });

  it("a command the server refused in Encounter A does not lock Encounter B", async () => {
    const user = userEvent.setup();
    serve({ "encounter-1": () => failure(403, "results.official_selection_forbidden") });
    const { navigate } = await openAWithBCached(user);

    await user.click(await actAsAway(user));
    await user.type(reason("Rechazar la propuesta"), rejectionReason);
    await user.click(
      dialog("Rechazar la propuesta").getByRole("button", { name: "Rechazar propuesta" }),
    );
    expect(
      await team().findByText(
        "No puedes ver ni operar la selección oficial de este enfrentamiento.",
      ),
    ).toBeTruthy();

    navigate("encounter-2");

    expect(await heading(B)).toBeTruthy();
    expect(await actAsAway(user)).toBeTruthy();
    expect(
      team().queryByText("No puedes ver ni operar la selección oficial de este enfrentamiento."),
    ).toBeNull();
  });

  it("keeps the typed reasons when the same Encounter renders again and refetches", async () => {
    const user = userEvent.setup();
    serve();
    const { navigate } = await openAWithBCached(user);

    await typeAndClose(user, await actAsAway(user), "Rechazar la propuesta", "Motivo de A");
    navigate("encounter-1");
    await user.click(team().getByRole("button", { name: "Actualizar selección" }));

    await user.click(await team().findByRole("button", { name: "Rechazar" }));
    expect(reason("Rechazar la propuesta").value).toBe("Motivo de A");
  });

  it("keeps the operator return reason across Expediente -> Selección -> Expediente tab switches", async () => {
    const user = userEvent.setup();
    serve();
    await openAWithBCached(user);

    await openReviewTab(user);
    await typeAndClose(
      user,
      await review().findByRole("button", { name: "Devolver a selección" }),
      "Devolver el caso a selección",
      "Devolución tras revisar candidatos",
    );

    await openSelectionTab(user);
    expect(await screen.findByRole("list", { name: "Partidos EA candidatos" })).toBeTruthy();

    await openReviewTab(user);
    await user.click(await review().findByRole("button", { name: "Devolver a selección" }));
    expect(reason("Devolver el caso a selección").value).toBe("Devolución tras revisar candidatos");
  });

  it("keeps the Encounter and the operator reason when Actualizar fails to re-read the detail", async () => {
    const user = userEvent.setup();
    const detail = { fails: false };
    serve({}, detail);
    await openAWithBCached(user);

    await openReviewTab(user);
    await typeAndClose(
      user,
      await review().findByRole("button", { name: "Devolver a selección" }),
      "Devolver el caso a selección",
      "Devolución pendiente",
    );

    detail.fails = true;
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(
      await screen.findByText(
        "No pudimos actualizar el enfrentamiento. Ves los últimos datos cargados.",
      ),
    ).toBeTruthy();
    expect(await heading(A)).toBeTruthy();

    detail.fails = false;
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() =>
      expect(
        screen.queryByText(
          "No pudimos actualizar el enfrentamiento. Ves los últimos datos cargados.",
        ),
      ).toBeNull(),
    );
    await user.click(await review().findByRole("button", { name: "Devolver a selección" }));
    expect(reason("Devolver el caso a selección").value).toBe("Devolución pendiente");
  });
});
