import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { encounterView } from "@/modules/results/presentation/encounter-page.fixtures.ts";
import { captainCreation, noCreation, openScheduleChange } from "./schedule-changes.fixtures.ts";
import {
  ScheduleChangesSection,
  type ScheduleChangeCommands,
  type ScheduleChangesState,
} from "./schedule-changes-section.tsx";

const styles = stylex.create({
  frame: {
    width: "100%",
    maxWidth: "64rem",
    marginInline: "auto",
    backgroundColor: colors.background,
    padding: "1.5rem",
    minHeight: "100svh",
  },
  narrow: { maxWidth: 360, padding: "1rem" },
});

type Scenario =
  | "captainCreate"
  | "noticeError"
  | "rivalOpen"
  | "requesterWaiting"
  | "blockedByResult"
  | "appliedHistory"
  | "staleReview";
type Args = { readonly scenario: Scenario; readonly locale: Locale; readonly narrow?: boolean };

const view = encounterView();
const appliedView = encounterView({
  officialMatches: [
    { officialSlot: 1, scheduledStartAt: "2026-09-15T01:00:00.000Z" },
    { officialSlot: 2, scheduledStartAt: "2026-10-11T20:00:00.000Z" },
  ],
});
const fail = (status: number, code: string, anchor?: "current" | "proposed") =>
  new FutrobApiError({
    status,
    body: { code, messageKey: `errors.${code}`, details: anchor ? { anchor } : undefined },
  });

const reasons = (reason: "own_proposal" | "request_closed") =>
  (["accept", "reject", "counter"] as const).map((action) => ({ action, reason }));
const ownProposal = {
  allowedActions: [],
  respondAs: null,
  blockedActions: reasons("own_proposal"),
} satisfies Partial<ScheduleChangeRequestDto>;
const closed = {
  allowedActions: [],
  respondAs: null,
  blockedActions: reasons("request_closed"),
} satisfies Partial<ScheduleChangeRequestDto>;
const blockedScopes = captainCreation().scopes.map((option) => ({
  ...option,
  blockedReason: "active_request_exists" as const,
}));

const setups: Record<
  Scenario,
  () => Pick<Extract<ScheduleChangesState, { kind: "ready" }>, "requests" | "creation">
> = {
  captainCreate: () => ({
    requests: [],
    creation: captainCreation({
      scopes: captainCreation().scopes.map((option, index) =>
        index === 1 ? { ...option, blockedReason: "result_protected" } : option,
      ),
    }),
  }),
  noticeError: () => ({ requests: [], creation: captainCreation() }),
  rivalOpen: () => ({ requests: [openScheduleChange()], creation: noCreation }),
  staleReview: () => ({ requests: [openScheduleChange()], creation: noCreation }),
  requesterWaiting: () => ({
    requests: [openScheduleChange(ownProposal)],
    creation: captainCreation({ scopes: blockedScopes }),
  }),
  blockedByResult: () => ({
    requests: [
      openScheduleChange({
        scope: { type: "official_match", officialSlot: 1 },
        allowedActions: ["reject"],
        blockedActions: [
          { action: "accept", reason: "result_protected" },
          { action: "counter", reason: "result_protected" },
        ],
      }),
    ],
    creation: noCreation,
  }),
  appliedHistory: () => ({
    requests: [
      openScheduleChange({
        status: "accepted",
        version: 2,
        scope: { type: "official_match", officialSlot: 2 },
        ...closed,
        decisions: [
          {
            id: "consent-1",
            proposalId: "proposal-1",
            requestVersion: 1,
            kind: "consent",
            responder: { authority: "rival_team", teamId: "team-away" },
            actorId: "captain-away",
            reason: null,
            createdAt: "2026-09-02T10:00:00.000Z",
          },
        ],
        application: {
          id: "application-1",
          proposalId: "proposal-1",
          requestVersion: 2,
          appliedByActorId: "captain-away",
          previousEncounterStartAt: "2026-09-15T01:00:00.000Z",
          appliedEncounterStartAt: "2026-09-15T01:00:00.000Z",
          slots: [
            {
              officialSlot: 2,
              previousStartAt: "2026-09-17T01:30:00.000Z",
              appliedStartAt: "2026-10-11T20:00:00.000Z",
            },
          ],
          appliedAt: "2026-09-02T10:00:00.000Z",
        },
      }),
    ],
    creation: noCreation,
  }),
};

function TeamActionsStory({ scenario, locale, narrow }: Args) {
  const [server, setServer] = useState(setups[scenario]);
  const answer = (next: Partial<ScheduleChangeRequestDto>) =>
    setServer((current) => ({
      ...current,
      requests: current.requests.map((request) => ({
        ...request,
        ...next,
        version: request.version + 1,
      })),
    }));
  const commands: ScheduleChangeCommands = {
    create: async (body) => {
      if (scenario === "noticeError") {
        throw fail(409, "scheduling.reschedule_notice_not_met", "proposed");
      }
      setServer({
        requests: [openScheduleChange({ scope: body.scope, ...ownProposal })],
        creation: captainCreation({ scopes: blockedScopes }),
      });
    },
    accept: async () => {
      if (scenario === "staleReview") {
        answer({});
        throw fail(409, "scheduling.schedule_change_version_conflict");
      }
      answer({ status: "accepted", ...closed });
    },
    reject: async () => answer({ status: "rejected", ...closed }),
    counter: async (_target, body) =>
      answer({
        currentProposalId: "proposal-2",
        proposals: [
          ...openScheduleChange().proposals,
          {
            id: "proposal-2",
            proposedStartAt: "2026-10-12T23:00:00.000Z",
            proposedByActorId: "captain-away",
            proposedByTeamId: "team-away",
            reason: body.reason,
            createdAt: "2026-09-02T15:00:00.000Z",
            responseDeadline: "2026-09-04T15:00:00.000Z",
          },
        ],
        ...ownProposal,
      }),
    resolve: async () => undefined,
  };
  const state: ScheduleChangesState = {
    kind: "ready",
    ...server,
    refreshing: false,
    refreshFailed: false,
    refresh: () => undefined,
    commands,
  };
  return (
    <I18nProvider initialLocale={locale}>
      <div {...applyStyles(styles.frame, narrow && styles.narrow)}>
        <ScheduleChangesSection
          state={state}
          view={scenario === "appliedHistory" ? appliedView : view}
        />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Competition/Encounter Rescheduling/Team actions",
  parameters: { layout: "fullscreen" },
  args: { scenario: "captainCreate", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: Object.keys(setups) },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <TeamActionsStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

const fillRequest = async (canvasElement: HTMLElement, date: string) => {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "Solicitar reprogramación" }));
  await userEvent.type(canvas.getByLabelText("Nueva fecha y hora"), date);
  await userEvent.type(canvas.getByRole("textbox", { name: "Motivo para el rival" }), "Viaje");
  await userEvent.click(canvas.getByRole("button", { name: "Enviar solicitud" }));
  return canvas;
};

export const CaptainCreate: Story = {
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Solicitar reprogramación" }));
    await expect(canvas.getByRole("radio", { name: "Partido 1" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(canvas.getByRole("radio", { name: "Partido 2" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
export const NoticeError: Story = {
  args: { scenario: "noticeError" },
  play: async ({ canvasElement }) => {
    const canvas = await fillRequest(canvasElement, "2026-09-14T21:00");
    await expect(
      await canvas.findByText(
        "La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.",
      ),
    ).toBeVisible();
    await expect(canvas.getByLabelText("Nueva fecha y hora")).toHaveFocus();
  },
};
export const EnglishCreate: Story = { args: { locale: "en" } };
export const RivalOpen: Story = {
  args: { scenario: "rivalOpen" },
  parameters: { a11y: { test: "error" } },
};
export const RequesterWaiting: Story = { args: { scenario: "requesterWaiting" } };
export const AcceptConfirm: Story = {
  args: { scenario: "rivalOpen" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar" }));
    await expect(canvas.getByRole("heading", { name: "Aceptar la propuesta" })).toHaveFocus();
    await expect(canvas.getByText(/pasa de/)).toBeVisible();
  },
};
export const CounterForm: Story = {
  args: { scenario: "rivalOpen" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Contraproponer" }));
    await expect(canvas.getByLabelText("Nueva fecha y hora")).toHaveFocus();
  },
};
export const BlockedByResult: Story = { args: { scenario: "blockedByResult" } };
export const AppliedHistory: Story = {
  args: { scenario: "appliedHistory" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Historial de propuestas y decisiones" }),
    );
    await waitFor(() => expect(canvas.getByText(/^Partido 2: /)).toBeVisible());
  },
};
export const EnglishRival: Story = { args: { scenario: "rivalOpen", locale: "en" } };
export const Narrow360: Story = {
  args: { narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Solicitar reprogramación" }));
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};
export const StaleReview: Story = {
  args: { scenario: "staleReview" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Aceptar" }));
    await userEvent.click(canvas.getByRole("button", { name: "Confirmar aceptación" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "La propuesta cambió. Revisa la propuesta actual antes de responder.",
    );
  },
};
