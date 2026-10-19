// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { encounterView, m1, m2, m3, m5, readyCandidates } from "./encounter-page.fixtures.ts";
import { EncounterRoute } from "./encounter-route.tsx";
import {
  approvalReason,
  awayRematch,
  commandResponse,
  disputeCase,
  disputeReason,
  homeProposal,
  m3Disconnected,
  resolvedByApproval,
  returnedToSelection,
  returnReason,
  reviewCase,
  reviewReason,
} from "./official-selection.fixtures.ts";
import { noCreation } from "@/modules/scheduling/presentation/schedule-changes.fixtures.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const DOSSIER = "/api/v1/organizations/org-1/encounters/encounter-1/official-selection/disputes";

type Post = { readonly path: string; readonly body: Record<string, unknown> };
type Handler = (post: Post) => Response | Promise<Response>;

let posts: Post[];
let dossierReads: number;
let approverAsked: boolean;

/**
 * Stands in for the BFF: effective access, the Encounter, its candidates, the
 * operator's dossier and the review/resolve commands. The actor represents no Team.
 */
function serve(config: {
  readonly approves: boolean;
  readonly dossier: { current: OfficialSelectionViewDto | Response };
  readonly commands?: Partial<Record<"/review" | "/resolve", Handler>>;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "https://web.test");
      const method = init?.method ?? "GET";
      if (url.pathname === "/api/v1/authorization/effective-access") {
        const permission = url.searchParams.get("permissions") ?? "";
        const approves = permission === "encounters.results.approve";
        if (approves) approverAsked = true;
        return Response.json({
          actorId: "actor-operator",
          scope: { organizationId: "org-1" },
          roles: [],
          permissions: [
            { permission, allowed: approves && config.approves, decidedAt: "organization" },
          ],
        });
      }
      if (url.pathname === "/api/v1/organizations/org-1/encounters/encounter-1") {
        return Response.json(encounterView());
      }
      if (url.pathname === "/api/v1/encounters/encounter-1/candidates") {
        return Response.json(readyCandidates([m1, m2, m3, m5]));
      }
      if (url.pathname === "/api/v1/encounters/encounter-1/schedule-change-requests") {
        return Response.json({ requests: [], creation: noCreation });
      }
      if (url.pathname === DOSSIER && method === "GET") {
        dossierReads += 1;
        const view = config.dossier.current;
        return view instanceof Response ? view.clone() : Response.json(view);
      }
      if (url.pathname.startsWith(`${DOSSIER}/`) && method === "POST") {
        const post = {
          path: url.pathname.slice(DOSSIER.length),
          body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        };
        posts.push(post);
        const handler = config.commands?.[post.path as "/review" | "/resolve"];
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

const REVIEW = "Revisión de la organización";
const review = () => within(screen.getByRole("region", { name: REVIEW }));
const findReview = async () => within(await screen.findByRole("region", { name: REVIEW }));
const dialog = (name: string) => within(screen.getByRole("dialog", { name }));

const X_Y = "Propuesta 1 · ronda 1";
const X_Z = "Propuesta 2 · ronda 1";
const SLOT_2_OF_X_Y = "Partido 2: Cuervos FC 0–2 Maderas FC";
const SLOT_2_OF_X_Z = "Partido 2: Cuervos FC 3–3 Maderas FC";

async function approveXZ(user: UserEvent, reason: string) {
  await user.click(
    await (await findReview()).findByRole("button", { name: "Aprobar una propuesta" }),
  );
  const approve = dialog("Aprobar una propuesta");
  await user.click(approve.getByRole("radio", { name: `${X_Z} · De Maderas FC` }));
  await user.type(approve.getByRole("textbox", { name: "Motivo" }), reason);
  await user.click(approve.getByRole("button", { name: "Aprobar propuesta" }));
  return approve;
}

beforeEach(() => {
  posts = [];
  dossierReads = 0;
  approverAsked = false;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Operator dispute review in the Match Center", () => {
  it("shows proposals X/Y and X/Z; approving X/Z makes X/Z's slots official, not X/Y's", async () => {
    const user = userEvent.setup();
    const dossier = { current: reviewCase() as OfficialSelectionViewDto | Response };
    serve({
      approves: true,
      dossier,
      commands: {
        "/resolve": () => {
          dossier.current = resolvedByApproval();
          return Response.json(commandResponse(resolvedByApproval()));
        },
      },
    });
    renderEncounter();

    const panel = await findReview();
    expect(await panel.findByText("En revisión de la organización")).toBeTruthy();
    expect(
      within(panel.getByRole("listitem", { name: X_Y })).getByText(SLOT_2_OF_X_Y),
    ).toBeTruthy();
    expect(
      within(panel.getByRole("listitem", { name: X_Z })).getByText(SLOT_2_OF_X_Z),
    ).toBeTruthy();

    await user.click(panel.getByRole("button", { name: "Aprobar una propuesta" }));
    const approve = dialog("Aprobar una propuesta");
    expect(approve.getByRole("radio", { name: `${X_Y} · De Cuervos FC` })).toBeTruthy();
    await user.click(approve.getByRole("radio", { name: `${X_Z} · De Maderas FC` }));
    const summary = within(approve.getByRole("group", { name: "Se aprobará" }));
    expect(summary.getByText(X_Z)).toBeTruthy();
    expect(summary.getByText(SLOT_2_OF_X_Z)).toBeTruthy();
    expect(summary.queryByText(SLOT_2_OF_X_Y)).toBeNull();
    await user.type(approve.getByRole("textbox", { name: "Motivo" }), approvalReason);
    await user.click(approve.getByRole("button", { name: "Aprobar propuesta" }));

    expect(await screen.findByText("Propuesta aprobada. El resultado ya es oficial.")).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/resolve",
        body: {
          expectedVersion: 4,
          commandKey: expect.any(String),
          reason: approvalReason,
          decision: { type: "approve_proposal", proposalId: "proposal-2" },
        },
      },
    ]);
    const official = within(review().getByRole("group", { name: "Partidos aprobados" }));
    expect(official.getByText(`${X_Z} · por resolución de la organización`)).toBeTruthy();
    expect(official.getByText(SLOT_2_OF_X_Z)).toBeTruthy();
    expect(official.queryByText(SLOT_2_OF_X_Y)).toBeNull();
    expect(review().getByText("Resultado oficial aprobado")).toBeTruthy();
    expect(review().queryByRole("button", { name: "Aprobar una propuesta" })).toBeNull();
    expect(review().queryByRole("button", { name: "Devolver a selección" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: REVIEW })),
    );
  });

  it("tells apart proposals whose match 2 shares clubs and score by the EA match and its time", async () => {
    const user = userEvent.setup();
    serve({
      approves: true,
      dossier: { current: { ...reviewCase(), proposals: [homeProposal, awayRematch] } },
    });
    renderEncounter();

    const panel = await findReview();
    const M2 = "Partido EA m-2 · jugado mié, 16 sept, 20:40";
    const M5 = "Partido EA m-5 · jugado mié, 16 sept, 21:40";
    expect(within(await panel.findByRole("listitem", { name: X_Y })).getByText(M2)).toBeTruthy();
    expect(within(panel.getByRole("listitem", { name: X_Z })).getByText(M5)).toBeTruthy();

    await user.click(panel.getByRole("button", { name: "Aprobar una propuesta" }));
    const approve = dialog("Aprobar una propuesta");
    const xy = approve.getByRole("radio", { name: `${X_Y} · De Cuervos FC` });
    const xz = approve.getByRole("radio", { name: `${X_Z} · De Maderas FC` });
    expect(within(xy).getByText(M2)).toBeTruthy();
    expect(within(xy).queryByText(M5)).toBeNull();
    expect(within(xz).getByText(M5)).toBeTruthy();
    expect(within(xz).queryByText(M2)).toBeNull();
    expect(xy.textContent).not.toBe(xz.textContent);

    await user.click(xz);
    const summary = within(approve.getByRole("group", { name: "Se aprobará" }));
    expect(summary.getByText(M5)).toBeTruthy();
    expect(summary.queryByText(M2)).toBeNull();
  });

  it("returning needs a reason, then shows selection in progress with it; history keeps the rejection and the resolution", async () => {
    const user = userEvent.setup();
    const dossier = { current: reviewCase() as OfficialSelectionViewDto | Response };
    serve({
      approves: true,
      dossier,
      commands: {
        "/resolve": () => {
          dossier.current = returnedToSelection();
          return Response.json(commandResponse(returnedToSelection()));
        },
      },
    });
    renderEncounter();

    await user.click(
      await (await findReview()).findByRole("button", { name: "Devolver a selección" }),
    );
    const giveBack = dialog("Devolver el caso a selección");
    const closing = within(giveBack.getByRole("group", { name: "Propuestas que se cierran" }));
    expect(closing.getByText(SLOT_2_OF_X_Y)).toBeTruthy();
    expect(closing.getByText(SLOT_2_OF_X_Z)).toBeTruthy();
    await user.click(giveBack.getByRole("button", { name: "Devolver a selección" }));
    expect(giveBack.getByText("Escribe un motivo para continuar.")).toBeTruthy();
    expect(posts).toEqual([]);
    await user.type(giveBack.getByRole("textbox", { name: "Motivo" }), returnReason);
    await user.click(giveBack.getByRole("button", { name: "Devolver a selección" }));

    expect(await screen.findByText("Caso devuelto a selección.")).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/resolve",
        body: {
          expectedVersion: 4,
          commandKey: expect.any(String),
          reason: returnReason,
          decision: { type: "return_to_selection" },
        },
      },
    ]);
    expect(review().getByText("Selección en curso")).toBeTruthy();
    const decision = within(review().getByRole("group", { name: "Última resolución" }));
    expect(decision.getByText(returnReason)).toBeTruthy();
    expect(review().queryByText("Resultado oficial aprobado")).toBeNull();

    await user.click(review().getByRole("tab", { name: "Historial" }));
    const history = within(review().getByRole("list", { name: "Historial de la selección" }));
    const rejection = within(history.getByText("Propuesta rechazada").closest("li")!);
    expect(rejection.getByText(disputeReason)).toBeTruthy();
    const resolution = within(history.getByText("Devuelta a selección").closest("li")!);
    expect(resolution.getByText(returnReason)).toBeTruthy();
    expect(resolution.getByText(/^Organización/)).toBeTruthy();
  });

  it("shows nothing to an actor without results authority; the approver sees the redacted case and takes it", async () => {
    const dossier = { current: disputeCase() as OfficialSelectionViewDto | Response };
    serve({ approves: false, dossier });
    const outsider = renderEncounter();
    await screen.findByText("Partidos EA candidatos", { selector: "h2" });
    await waitFor(() => expect(approverAsked).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("region", { name: REVIEW })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tomar el caso" })).toBeNull();
    expect(screen.queryByText(disputeReason)).toBeNull();
    expect(dossierReads).toBe(0);
    outsider.unmount();

    const user = userEvent.setup();
    serve({
      approves: true,
      dossier,
      commands: {
        "/review": () => {
          dossier.current = reviewCase();
          return Response.json(commandResponse(reviewCase()));
        },
      },
    });
    const { container } = renderEncounter();
    const panel = await findReview();
    expect(await panel.findByText("En disputa")).toBeTruthy();
    const dispute = within(panel.getByRole("group", { name: "Disputa" }));
    expect(dispute.getByText(disputeReason)).toBeTruthy();
    expect(dispute.getByText("Abierta por Cuervos FC")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();

    await user.click(panel.getByRole("button", { name: "Tomar el caso" }));
    const take = dialog("Tomar el caso");
    expect(take.getByText(disputeReason)).toBeTruthy();
    await user.type(take.getByRole("textbox", { name: "Motivo" }), reviewReason);
    await user.click(take.getByRole("button", { name: "Tomar el caso" }));

    expect(
      await screen.findByText("Tomaste el caso. Está en revisión de la organización."),
    ).toBeTruthy();
    expect(posts).toEqual([
      {
        path: "/review",
        body: { expectedVersion: 3, commandKey: expect.any(String), reason: reviewReason },
      },
    ]);
    expect(review().getByRole("button", { name: "Aprobar una propuesta" })).toBeTruthy();
    expect(review().queryByRole("button", { name: "Tomar el caso" })).toBeNull();
  });

  it("collapses to a forbidden state that reveals nothing when the server refuses the dossier", async () => {
    serve({
      approves: true,
      dossier: { current: failure(403, "results.official_selection_forbidden") },
    });
    renderEncounter();

    expect(
      await (await findReview()).findByText("No puedes revisar disputas de este enfrentamiento."),
    ).toBeTruthy();
    expect(review().queryByRole("tab")).toBeNull();
    expect(review().queryByRole("button", { name: "Tomar el caso" })).toBeNull();
    expect(screen.queryByText(disputeReason)).toBeNull();
  });

  it("blocks approving a flagged proposal until acknowledged and sends the acknowledgement only then", async () => {
    const user = userEvent.setup();
    const dossier = {
      current: reviewCase({ integrityFlags: m3Disconnected }) as
        | OfficialSelectionViewDto
        | Response,
    };
    serve({
      approves: true,
      dossier,
      commands: {
        "/resolve": () => {
          dossier.current = resolvedByApproval();
          return Response.json(commandResponse(resolvedByApproval()));
        },
      },
    });
    renderEncounter();

    const approve = await approveXZ(user, approvalReason);
    expect(
      within(
        approve.getByRole("group", { name: "Avisos de integridad de esta propuesta" }),
      ).getByText("Hubo desconexión en el partido EA m-3"),
    ).toBeTruthy();
    expect(
      approve.getByText("Confirma que revisaste los avisos de integridad para aprobar."),
    ).toBeTruthy();
    expect(posts).toEqual([]);

    await user.click(
      approve.getByRole("checkbox", {
        name: "Revisé los avisos de integridad y apruebo igualmente",
      }),
    );
    await user.click(approve.getByRole("button", { name: "Aprobar propuesta" }));

    expect(await screen.findByText("Propuesta aprobada. El resultado ya es oficial.")).toBeTruthy();
    expect(posts.map((post) => post.body.decision)).toEqual([
      { type: "approve_proposal", proposalId: "proposal-2", acknowledgeIntegrityFlags: true },
    ]);
  });

  it("returns focus to the trigger when a dialog closes with Escape and sends nothing", async () => {
    const user = userEvent.setup();
    serve({ approves: true, dossier: { current: disputeCase() } });
    renderEncounter();

    const trigger = await (await findReview()).findByRole("button", { name: "Tomar el caso" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Tomar el caso" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(posts).toEqual([]);
  });

  it("keeps the choice and reason after a server failure; retrying resends the same key and approves once", async () => {
    const user = userEvent.setup();
    const dossier = { current: reviewCase() as OfficialSelectionViewDto | Response };
    let accepted = 0;
    serve({
      approves: true,
      dossier,
      commands: {
        "/resolve": () => {
          if (posts.length === 1) return failure(503, "api.upstream_unavailable");
          accepted += 1;
          dossier.current = resolvedByApproval();
          return Response.json(commandResponse(resolvedByApproval()));
        },
      },
    });
    renderEncounter();

    const approve = await approveXZ(user, approvalReason);
    expect(
      await approve.findByText(
        "No sabemos si se guardó porque falló la conexión. Reintentar envía la misma solicitud y no la duplica.",
      ),
    ).toBeTruthy();
    expect(
      approve.getByRole("radio", { name: `${X_Z} · De Maderas FC` }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(approve.getByRole<HTMLTextAreaElement>("textbox", { name: "Motivo" }).value).toBe(
      approvalReason,
    );
    expect(review().getByText("En revisión de la organización")).toBeTruthy();
    await user.click(approve.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Propuesta aprobada. El resultado ya es oficial.")).toBeTruthy();
    expect(posts).toHaveLength(2);
    expect(posts[1]?.body).toEqual(posts[0]?.body);
    expect(accepted).toBe(1);
  });

  it("a 409 reloads version 5, keeps the reason and resends nothing; the next submit uses version 5 and a new key", async () => {
    const user = userEvent.setup();
    const dossier = { current: reviewCase() as OfficialSelectionViewDto | Response };
    serve({
      approves: true,
      dossier,
      commands: {
        "/resolve": ({ body }) => {
          if (body.expectedVersion !== 5) {
            dossier.current = reviewCase({ version: 5 });
            return failure(409, "results.selection_version_conflict");
          }
          dossier.current = resolvedByApproval();
          return Response.json(commandResponse(resolvedByApproval()));
        },
      },
    });
    renderEncounter();

    const approve = await approveXZ(user, approvalReason);
    expect(
      await approve.findByText(
        "La selección cambió: leíste la versión 4 y ahora está en la 5. Revisa el estado actual; tu borrador se conserva y no se reenvió nada.",
      ),
    ).toBeTruthy();
    expect(approve.getByRole<HTMLTextAreaElement>("textbox", { name: "Motivo" }).value).toBe(
      approvalReason,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(posts).toHaveLength(1);

    await user.click(approve.getByRole("button", { name: "Aprobar propuesta" }));

    expect(await screen.findByText("Propuesta aprobada. El resultado ya es oficial.")).toBeTruthy();
    expect(posts.map((post) => post.body.expectedVersion)).toEqual([4, 5]);
    expect(posts[1]?.body.commandKey).not.toBe(posts[0]?.body.commandKey);
  });
});
