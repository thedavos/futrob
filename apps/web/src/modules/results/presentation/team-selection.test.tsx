// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView, m1, m2, m3, readyCandidates } from "./encounter-page.fixtures.ts";
import { EncounterRoute } from "./encounter-route.tsx";
import {
  alternativeSelection,
  approvedSelection,
  commandResponse,
  disputedSelection,
  noSelection,
  pendingSelection,
  rejectionReason,
} from "./official-selection.fixtures.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const SELECTION = "/api/v1/organizations/org-1/encounters/encounter-1/official-selection";
const ANSWERS = ["confirm", "reject", "propose_alternative", "open_dispute"] as const;

type Team = "team-home" | "team-away";
type Post = { readonly path: string; readonly body: Record<string, unknown> };
type Handler = (post: Post) => Response | Promise<Response>;

let posts: Post[];
let reads: string[];

/**
 * Stands in for the BFF: effective access per Team, the Team's selection view and the
 * command endpoints. Each test scripts the views and what each command answers.
 */
function serve(config: {
  readonly speaksFor: readonly Team[];
  readonly views: Partial<Record<Team, OfficialSelectionViewDto | Response>>;
  readonly commands?: Record<string, Handler>;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "https://web.test");
      const method = init?.method ?? "GET";
      if (url.pathname === "/api/v1/authorization/effective-access") {
        const teamId = url.searchParams.get("teamId") ?? "";
        return Response.json({
          actorId: "actor-1",
          scope: { organizationId: "org-1" },
          roles: [],
          permissions: [
            {
              permission: "encounters.official-selection.propose",
              allowed: config.speaksFor.includes(teamId as Team),
              decidedAt: "organization",
            },
          ],
        });
      }
      if (url.pathname === "/api/v1/organizations/org-1/encounters/encounter-1") {
        return Response.json(encounterView());
      }
      if (url.pathname === "/api/v1/encounters/encounter-1/candidates") {
        return Response.json(readyCandidates([m1, m2, m3]));
      }
      if (url.pathname === "/api/v1/encounters/encounter-1/schedule-change-requests") {
        return Response.json({ requests: [] });
      }
      if (url.pathname === SELECTION && method === "GET") {
        const team = url.searchParams.get("actingTeamId") as Team;
        reads.push(team);
        const view = config.views[team];
        if (!view) return failure(403, "results.official_selection_forbidden");
        return view instanceof Response ? view.clone() : Response.json(view);
      }
      if (url.pathname.startsWith(SELECTION) && method === "POST") {
        const post = {
          path: url.pathname.slice(SELECTION.length),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        };
        posts.push(post);
        const handler = config.commands?.[post.path];
        return handler ? handler(post) : failure(404, "api.not_found");
      }
      return failure(404, "api.not_found");
    }),
  );
}

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function renderEncounter() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale="es">
        <EncounterRoute
          competitionId="competition-1"
          encounterId="encounter-1"
          organizationId="org-1"
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

const panel = () => within(screen.getByRole("region", { name: "Selección oficial" }));
const findPanel = async () =>
  within(await screen.findByRole("region", { name: "Selección oficial" }));
const dialog = (name: string) => within(screen.getByRole("dialog", { name }));
const proposal = (name: string) => within(panel().getByRole("listitem", { name }));

async function useIn(user: UserEvent, candidate: RegExp, slot: 1 | 2) {
  const row = await screen.findByRole("listitem", { name: candidate });
  await user.click(within(row).getByRole("button", { name: `Usar en partido ${slot}` }));
}

const M1 = /^Cuervos EA contra Maderas EA, lun, 14 sept, 20:05/;
const M2 = /^Maderas EA contra Cuervos EA/;
const M3 = /^Cuervos EA contra Maderas EA, lun, 14 sept, 20:50/;

beforeEach(() => {
  posts = [];
  reads = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Team negotiation in the Match Center", () => {
  it("A proposes m-1/m-2 and waits without a confirm; B confirms version 1 and sees the approved result", async () => {
    const user = userEvent.setup();
    const views: Partial<Record<Team, OfficialSelectionViewDto>> = { "team-home": noSelection() };
    serve({
      speaksFor: ["team-home"],
      views,
      commands: {
        "/proposals": () => {
          views["team-home"] = pendingSelection([...ANSWERS]);
          return Response.json(commandResponse(pendingSelection(["open_dispute"])));
        },
      },
    });
    const home = renderEncounter();

    await screen.findByText("Aún no hay propuesta");
    await useIn(user, M1, 1);
    await useIn(user, M2, 2);
    await user.click(panel().getByRole("button", { name: "Proponer selección" }));
    const propose = dialog("Proponer la selección al rival");
    expect(propose.getByText("Partido 1: Cuervos FC 1–0 Maderas FC")).toBeTruthy();
    expect(propose.getByText("Partido 2: Cuervos FC 0–2 Maderas FC")).toBeTruthy();
    expect(propose.getByRole("region", { name: "Vista previa" })).toBeTruthy();
    await user.click(propose.getByRole("button", { name: "Enviar propuesta" }));

    expect(await screen.findByText("Propuesta enviada al rival.")).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/proposals",
        body: {
          actingTeamId: "team-home",
          expectedVersion: 0,
          commandKey: expect.any(String),
          selections: [
            { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
            { officialSlot: 2, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-2" } },
          ],
        },
      },
    ]);
    expect(await panel().findByText("Esperando confirmación del rival")).toBeTruthy();
    const pending = proposal("Propuesta 1 · ronda 1");
    expect(pending.getByText("Partido 1: Cuervos FC 1–0 Maderas FC")).toBeTruthy();
    expect(pending.getByText("Partido 2: Cuervos FC 0–2 Maderas FC")).toBeTruthy();
    expect(panel().getByRole("button", { name: "Abrir disputa" })).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Confirmar propuesta" })).toBeNull();
    expect(panel().queryByRole("button", { name: "Rechazar" })).toBeNull();
    expect(
      within(screen.getByRole("listitem", { name: "Partido 1" })).getByText(
        "Sin partido EA asignado",
      ),
    ).toBeTruthy();
    home.unmount();

    posts = [];
    const rival: Partial<Record<Team, OfficialSelectionViewDto>> = {
      "team-away": pendingSelection([...ANSWERS]),
    };
    serve({
      speaksFor: ["team-away"],
      views: rival,
      commands: {
        "/proposals/proposal-1/confirm": () => {
          rival["team-away"] = approvedSelection();
          return Response.json(commandResponse(approvedSelection()));
        },
      },
    });
    renderEncounter();
    await user.click(await screen.findByRole("button", { name: "Confirmar propuesta" }));
    const confirm = dialog("Confirmar la propuesta del rival");
    const target = within(confirm.getByRole("group", { name: "Propuesta a la que respondes" }));
    expect(target.getByText("Partido EA m-1 · jugado lun, 14 sept, 20:05")).toBeTruthy();
    expect(target.getByText("Partido EA m-2 · jugado mié, 16 sept, 20:40")).toBeTruthy();
    await user.click(confirm.getByRole("button", { name: "Confirmar" }));

    expect(await panel().findByText("Resultado oficial aprobado")).toBeTruthy();
    expect(proposal("Propuesta 1 · ronda 1").getByText("Aprobada")).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/proposals/proposal-1/confirm",
        body: { actingTeamId: "team-away", expectedVersion: 1, commandKey: expect.any(String) },
      },
    ]);
  });

  it("B rejects with a reason and the case is disputed, not official; an alternative m-1/m-3 keeps both proposals", async () => {
    const user = userEvent.setup();
    const views: Partial<Record<Team, OfficialSelectionViewDto>> = {
      "team-away": pendingSelection([...ANSWERS]),
    };
    serve({
      speaksFor: ["team-away"],
      views,
      commands: {
        "/proposals/proposal-1/reject": () => {
          views["team-away"] = disputedSelection();
          return Response.json(commandResponse(disputedSelection()));
        },
      },
    });
    const rejecting = renderEncounter();

    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    const reject = dialog("Rechazar la propuesta");
    await user.click(reject.getByRole("button", { name: "Rechazar propuesta" }));
    expect(reject.getByText("Escribe un motivo para continuar.")).toBeTruthy();
    expect(posts).toEqual([]);
    await user.type(reject.getByRole("textbox", { name: "Motivo" }), rejectionReason);
    await user.click(reject.getByRole("button", { name: "Rechazar propuesta" }));

    expect(await panel().findByText("En disputa")).toBeTruthy();
    expect(posts.map((post) => post.body.reason)).toEqual([rejectionReason]);
    const dispute = within(panel().getByRole("group", { name: "Disputa" }));
    expect(dispute.getByText(rejectionReason)).toBeTruthy();
    expect(dispute.getByText("Abierta por Maderas FC")).toBeTruthy();
    expect(
      panel().getByText("Todavía no es un resultado oficial y no genera estadísticas."),
    ).toBeTruthy();
    expect(panel().queryByText("Resultado oficial aprobado")).toBeNull();
    rejecting.unmount();

    posts = [];
    const alternative: Partial<Record<Team, OfficialSelectionViewDto>> = {
      "team-away": pendingSelection([...ANSWERS]),
    };
    serve({
      speaksFor: ["team-away"],
      views: alternative,
      commands: {
        "/proposals/proposal-1/alternative": () => {
          alternative["team-away"] = alternativeSelection();
          return Response.json(commandResponse(alternativeSelection()));
        },
      },
    });
    renderEncounter();
    await useIn(user, M1, 1);
    await useIn(user, M3, 2);
    await user.click(await screen.findByRole("button", { name: "Proponer alternativa" }));
    const counter = dialog("Proponer otros partidos EA");
    await user.type(counter.getByRole("textbox", { name: "Motivo" }), "El 2 fue a las 20:50.");
    await user.click(counter.getByRole("button", { name: "Enviar alternativa" }));

    expect(await screen.findByText("Alternativa enviada al rival.")).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/proposals/proposal-1/alternative",
        body: {
          actingTeamId: "team-away",
          expectedVersion: 1,
          commandKey: expect.any(String),
          reason: "El 2 fue a las 20:50.",
          selections: [
            { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
            { officialSlot: 2, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-3" } },
          ],
        },
      },
    ]);
    const first = proposal("Propuesta 1 · ronda 1");
    expect(first.getByText("Reemplazada")).toBeTruthy();
    expect(first.getByText("Partido 2: Cuervos FC 0–2 Maderas FC")).toBeTruthy();
    const second = proposal("Propuesta 2 · ronda 1");
    expect(second.getByText("Vigente")).toBeTruthy();
    expect(second.getByText("Partido 2: Cuervos FC 3–3 Maderas FC")).toBeTruthy();
  });

  it("a 409 reloads version 2, keeps the reason and resends nothing; the next submit is accepted once with a new key", async () => {
    const user = userEvent.setup();
    const views: Partial<Record<Team, OfficialSelectionViewDto>> = {
      "team-away": pendingSelection([...ANSWERS]),
    };
    let accepted = 0;
    serve({
      speaksFor: ["team-away"],
      views,
      commands: {
        "/proposals/proposal-1/reject": ({ body }) => {
          if (body.expectedVersion !== 2) {
            views["team-away"] = pendingSelection([...ANSWERS], 2);
            return failure(409, "results.selection_version_conflict");
          }
          accepted += 1;
          views["team-away"] = disputedSelection();
          return Response.json(commandResponse(disputedSelection()));
        },
      },
    });
    renderEncounter();

    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    const reject = dialog("Rechazar la propuesta");
    await user.type(reject.getByRole("textbox", { name: "Motivo" }), rejectionReason);
    await user.click(reject.getByRole("button", { name: "Rechazar propuesta" }));

    expect(
      await reject.findByText(
        "La selección cambió: leíste la versión 1 y ahora está en la 2. Revisa el estado actual; tu borrador se conserva y no se reenvió nada.",
      ),
    ).toBeTruthy();
    expect(panel().getByText("Versión 2")).toBeTruthy();
    expect(reject.getByRole<HTMLTextAreaElement>("textbox", { name: "Motivo" }).value).toBe(
      rejectionReason,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(posts).toHaveLength(1);

    await user.click(reject.getByRole("button", { name: "Rechazar propuesta" }));

    expect(
      await screen.findByText("Propuesta rechazada. La selección queda en disputa."),
    ).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(accepted).toBe(1);
    expect(posts.map((post) => post.body.expectedVersion)).toEqual([1, 2]);
    expect(posts[1]?.body.commandKey).not.toBe(posts[0]?.body.commandKey);
  });

  it("after a 409 that leaves nothing to answer, keeps the text and disables the submit", async () => {
    const user = userEvent.setup();
    const views: Partial<Record<Team, OfficialSelectionViewDto>> = {
      "team-away": pendingSelection([...ANSWERS]),
    };
    serve({
      speaksFor: ["team-away"],
      views,
      commands: {
        "/proposals/proposal-1/reject": () => {
          views["team-away"] = disputedSelection();
          return failure(409, "results.selection_state_conflict");
        },
      },
    });
    renderEncounter();

    await user.click(await screen.findByRole("button", { name: "Rechazar" }));
    const reject = dialog("Rechazar la propuesta");
    await user.type(reject.getByRole("textbox", { name: "Motivo" }), rejectionReason);
    await user.click(reject.getByRole("button", { name: "Rechazar propuesta" }));

    expect(
      await reject.findByText("Esta acción ya no está disponible en el estado actual."),
    ).toBeTruthy();
    expect(reject.getByRole<HTMLTextAreaElement>("textbox", { name: "Motivo" }).value).toBe(
      rejectionReason,
    );
    expect(
      reject.getByRole<HTMLButtonElement>("button", { name: "Rechazar propuesta" }).disabled,
    ).toBe(true);
    expect(posts).toHaveLength(1);
  });

  it("retries a proposal lost to the network with the same key and version", async () => {
    const user = userEvent.setup();
    const views: Partial<Record<Team, OfficialSelectionViewDto>> = { "team-home": noSelection() };
    let attempts = 0;
    serve({
      speaksFor: ["team-home"],
      views,
      commands: {
        "/proposals": () => {
          attempts += 1;
          if (attempts === 1) throw new TypeError("Failed to fetch");
          views["team-home"] = pendingSelection(["open_dispute"]);
          return Response.json(commandResponse(pendingSelection(["open_dispute"])));
        },
      },
    });
    renderEncounter();

    await useIn(user, M1, 1);
    await useIn(user, M2, 2);
    await user.click(await screen.findByRole("button", { name: "Proponer selección" }));
    const propose = dialog("Proponer la selección al rival");
    await user.click(propose.getByRole("button", { name: "Enviar propuesta" }));
    expect(
      await propose.findByText(
        "No sabemos si se guardó porque falló la conexión. Reintentar envía la misma solicitud y no la duplica.",
      ),
    ).toBeTruthy();
    await user.click(propose.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Propuesta enviada al rival.")).toBeTruthy();
    expect(posts).toHaveLength(2);
    expect(posts[1]?.body).toEqual(posts[0]?.body);
    expect(posts[0]?.body.expectedVersion).toBe(0);
  });

  it("shows no Team panel to a non-representative and no commands to a Team with none allowed", async () => {
    serve({ speaksFor: [], views: { "team-home": noSelection() } });
    const spectator = renderEncounter();
    await screen.findByText("Partidos EA candidatos", { selector: "h2" });
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThanOrEqual(5));
    expect(screen.queryByRole("region", { name: "Selección oficial" })).toBeNull();
    expect(reads).toEqual([]);
    spectator.unmount();

    serve({ speaksFor: ["team-home"], views: { "team-home": approvedSelection() } });
    const reader = renderEncounter();
    expect(await (await findPanel()).findByText("Resultado oficial aprobado")).toBeTruthy();
    expect(
      panel().getByText("No hay acciones disponibles para tu equipo en este estado."),
    ).toBeTruthy();
    for (const name of ["Proponer selección", "Confirmar propuesta", "Rechazar", "Abrir disputa"]) {
      expect(panel().queryByRole("button", { name })).toBeNull();
    }
    reader.unmount();

    serve({ speaksFor: ["team-home"], views: { "team-home": noSelection(["propose"]) } });
    renderEncounter();
    expect(
      await (await findPanel()).findByRole("button", { name: "Proponer selección" }),
    ).toBeTruthy();
    expect(reads).toEqual(["team-home", "team-home"]);
    expect(posts).toEqual([]);
  });

  it("collapses to the forbidden state when the server refuses the Team read", async () => {
    serve({
      speaksFor: ["team-home"],
      views: { "team-home": failure(403, "results.official_selection_forbidden") },
    });
    renderEncounter();

    expect(
      await (
        await findPanel()
      ).findByText("No puedes ver ni operar la selección oficial de este enfrentamiento."),
    ).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Proponer selección" })).toBeNull();
    expect(panel().queryByText("Aún no hay propuesta")).toBeNull();
  });

  it("lets an actor representing both Teams choose which one acts", async () => {
    const user = userEvent.setup();
    serve({
      speaksFor: ["team-home", "team-away"],
      views: {
        "team-home": pendingSelection(["open_dispute"]),
        "team-away": pendingSelection([...ANSWERS]),
      },
    });
    renderEncounter();

    const actingAs = await (await findPanel()).findByRole("radiogroup", { name: "Actúas por" });
    expect(await panel().findByRole("button", { name: "Abrir disputa" })).toBeTruthy();
    expect(panel().queryByRole("button", { name: "Confirmar propuesta" })).toBeNull();
    await user.click(within(actingAs).getByRole("radio", { name: "Maderas FC" }));

    expect(await panel().findByRole("button", { name: "Confirmar propuesta" })).toBeTruthy();
    expect(reads).toEqual(["team-home", "team-away"]);
  });

  it("returns focus to the trigger when a dialog closes with Escape", async () => {
    const user = userEvent.setup();
    serve({ speaksFor: ["team-away"], views: { "team-away": pendingSelection([...ANSWERS]) } });
    renderEncounter();

    const trigger = await screen.findByRole("button", { name: "Abrir disputa" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Abrir una disputa" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(posts).toEqual([]);
  });
});
