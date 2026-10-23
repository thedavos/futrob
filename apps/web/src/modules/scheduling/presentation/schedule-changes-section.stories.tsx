import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { FutrobApiError } from "@futrob/sdk";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { encounterView } from "@/modules/results/presentation/encounter-page.fixtures.ts";
import { escalatedScheduleChange, noCreation } from "./schedule-changes.fixtures.ts";
import { ScheduleChangesSection, type ScheduleChangesState } from "./schedule-changes-section.tsx";

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
  | "escalated"
  | "open"
  | "resolved"
  | "denied"
  | "loading"
  | "empty"
  | "error"
  | "refreshFailed"
  | "forbidden"
  | "conflict"
  | "pending";
type Args = { readonly scenario: Scenario; readonly locale: Locale; readonly narrow?: boolean };
const noop = () => undefined;
const noCommand = async () => undefined;

function ResolutionStory({ scenario, locale, narrow }: Args) {
  const [request, setRequest] = useState(() =>
    escalatedScheduleChange({
      ...(scenario === "open" ? { status: "open", allowedActions: [], actions: [] } : {}),
      ...(scenario === "denied" ? { allowedActions: [] } : {}),
      ...(scenario === "resolved" ? { status: "resolved_by_organizer", allowedActions: [] } : {}),
    }),
  );
  const state: ScheduleChangesState =
    scenario === "loading" || scenario === "forbidden"
      ? { kind: scenario }
      : scenario === "error"
        ? { kind: "error", retry: noop }
        : {
            kind: "ready",
            requests: scenario === "empty" ? [] : [request],
            refreshing: false,
            refreshFailed: scenario === "refreshFailed",
            refresh: noop,
            creation: noCreation,
            commands: {
              create: noCommand,
              accept: noCommand,
              reject: noCommand,
              counter: noCommand,
              resolve: async (_requestId, input) => {
                if (scenario === "pending") await new Promise<void>(() => undefined);
                if (scenario === "conflict")
                  throw new FutrobApiError({
                    status: 409,
                    body: {
                      code: "scheduling.schedule_change_concurrency_conflict",
                      messageKey: "errors.scheduling.schedule_change_concurrency_conflict",
                    },
                  });
                setRequest((current) => ({
                  ...current,
                  status: "resolved_by_organizer",
                  version: current.version + 1,
                  allowedActions: [],
                  actions: [
                    ...current.actions,
                    {
                      id: "resolution-1",
                      kind: "schedule_change_resolved",
                      actorId: "organizer-1",
                      authority: "organizer",
                      proposalId: input.proposalId,
                      fromVersion: input.expectedVersion,
                      toVersion: input.expectedVersion + 1,
                      responseDeadline: "2026-11-01T22:00:00.000Z",
                      processedAt: "2026-11-02T09:00:00.000Z",
                      resolution: input.resolution,
                    },
                  ],
                }));
              },
            },
          };
  return (
    <I18nProvider initialLocale={locale}>
      <div {...applyStyles(styles.frame, narrow && styles.narrow)}>
        <ScheduleChangesSection
          state={state}
          view={encounterView({
            home: { ...encounterView().home, teamId: "team-home" },
            away: { ...encounterView().away, teamId: "team-away" },
          })}
        />
      </div>
    </I18nProvider>
  );
}
const meta = {
  title: "Product/Competition/Rescheduling/Organizer",
  parameters: { layout: "fullscreen" },
  args: { scenario: "escalated", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "escalated",
        "open",
        "resolved",
        "denied",
        "loading",
        "empty",
        "error",
        "refreshFailed",
        "forbidden",
        "conflict",
        "pending",
      ],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <ResolutionStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Playground: Story = {};
export const EscalatedWithPartialConsent: Story = {
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Historial de propuestas y decisiones" }),
    );
    await waitFor(() => expect(canvas.getByText("Consentimiento de Cuervos FC")).toBeVisible());
    await waitFor(() => expect(canvas.getByText(/Plazo vencido el/)).toBeVisible());
  },
};
export const KeepSchedule: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Conservar horario" }));
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Motivo de la resolución" }),
      "Se mantiene el horario publicado.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Guardar resolución" }));
    await expect(canvas.getByText("Resuelta por el organizador")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Historial de propuestas y decisiones" }),
    );
    await waitFor(() =>
      expect(canvas.getByText("Se mantiene el horario publicado.")).toBeVisible(),
    );
  },
};
export const WalkoverIntention: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Registrar intención de walkover" }));
    await expect(canvas.getByText(/No crea un resultado oficial/)).toBeVisible();
    await expect(
      canvas.getByRole("radiogroup", { name: "Equipo ganador de la intención" }),
    ).toBeVisible();
  },
};
export const English: Story = { args: { locale: "en" } };
export const Negotiating: Story = { args: { scenario: "open" } };
export const NoResolvePermission: Story = { args: { scenario: "denied" } };
export const Forbidden: Story = { args: { scenario: "forbidden" } };
export const Loading: Story = { args: { scenario: "loading" } };
export const Empty: Story = { args: { scenario: "empty" } };
export const ErrorState: Story = { args: { scenario: "error" } };
export const RefreshFailed: Story = { args: { scenario: "refreshFailed" } };
export const Conflict: Story = { args: { scenario: "conflict" } };
export const Saving: Story = {
  args: { scenario: "pending" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Motivo de la resolución" }),
      "Aplicar el horario acordado.",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Guardar resolución" }));
    await expect(canvas.getByRole("button", { name: "Guardando resolución…" })).toBeDisabled();
  },
};
export const Narrow360: Story = {
  args: { narrow: true },
  play: async ({ canvasElement }) => {
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};
