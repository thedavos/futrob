import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, fn, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import type { OrganizationAuditEntryDto } from "@futrob/api-contracts";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { applyStyles } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { AuditPageView, type AuditPageState } from "./audit-page.tsx";
import type { AuditFilters } from "./audit-filters.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: { width: 360, maxWidth: "100%", boxSizing: "border-box", paddingInline: "1rem" },
});

const entries: OrganizationAuditEntryDto[] = [
  {
    id: "92:sanction:sanction-1",
    organizationId: "org-1",
    competitionId: "competition-1",
    actorId: "actor-organizer",
    actorName: "María Torres",
    action: "sanctions.revoked",
    reason: "Apelación aceptada. El retraso fue causado por una caída del servidor.",
    occurredAt: "2026-11-10T14:00:00.000Z",
    requestId: "audit-request-2",
    object: {
      type: "sanction",
      id: "sanction-1",
      label: "Club Atlético Halcones del Pacífico",
      href: "/orgs/org-1/competitions/competition-1/sanctions",
    },
  },
  {
    id: "90:authorization:role-change-1",
    organizationId: "org-1",
    competitionId: null,
    actorId: "actor-organizer",
    actorName: "María Torres",
    action: "authorization.organization-role.changed",
    reason: "Nuevo responsable de la mesa de competición.",
    occurredAt: "2026-11-10T13:30:00.000Z",
    requestId: null,
    object: {
      type: "actor",
      id: "actor-staff",
      label: "Diego Ramírez",
      href: "/orgs/org-1/settings/members",
    },
  },
  {
    id: "01:organization:org-1",
    organizationId: "org-1",
    competitionId: null,
    actorId: null,
    actorName: null,
    action: "organizations.created",
    reason: null,
    occurredAt: "2026-11-09T10:00:00.000Z",
    requestId: null,
    object: { type: "organization", id: "org-1", label: "Liga del Pacífico", href: "/orgs/org-1" },
  },
];

type Scenario =
  | "ready"
  | "empty"
  | "filteredEmpty"
  | "loading"
  | "error"
  | "denied"
  | "refreshError";
type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
  readonly competition?: boolean;
  readonly onFilter: (filters: AuditFilters) => void;
  readonly onRetry: () => void;
};

function AuditStory({
  scenario,
  locale,
  narrow = false,
  competition = false,
  onFilter,
  onRetry,
}: StoryArgs) {
  const [filters, setFilters] = useState<AuditFilters>(
    scenario === "filteredEmpty" ? { actorId: "actor-missing" } : {},
  );
  const [previous, setPrevious] = useState(false);
  const [queryClient] = useState(() => {
    const client = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
    const scope = { organizationId: "org-1", competitionId: "competition-1" };
    client.setQueryData(
      queryKeys.authorization.effectiveAccess(scope, [ORGANIZATION_PERMISSION.auditTrailRead]),
      {
        actorId: "actor-organizer",
        scope,
        roles: [],
        permissions: [
          {
            permission: ORGANIZATION_PERMISSION.auditTrailRead,
            allowed: true,
            decidedAt: "organization",
          },
        ],
      },
    );
    return client;
  });
  const data = {
    entries:
      scenario === "empty" || (scenario === "filteredEmpty" && filters.actorId)
        ? []
        : previous
          ? entries.slice(-1)
          : competition
            ? entries.filter((entry) => entry.competitionId)
            : entries,
    nextCursor:
      previous || scenario === "empty" || (scenario === "filteredEmpty" && filters.actorId)
        ? null
        : "page-2",
  };
  const state: AuditPageState =
    scenario === "loading" || scenario === "denied"
      ? { kind: scenario }
      : scenario === "error"
        ? { kind: "error", retry: onRetry }
        : {
            kind: "ready",
            data,
            refreshError: scenario === "refreshError" ? onRetry : undefined,
          };
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
        <div {...applyStyles(styles.frame, narrow && styles.narrow)}>
          <AuditPageView
            organizationId="org-1"
            competitionId={competition ? "competition-1" : undefined}
            state={state}
            filters={filters}
            onFilter={(next) => {
              setFilters(next);
              setPrevious(false);
              onFilter(next);
            }}
            onNext={() => setPrevious(true)}
            onPrevious={() => setPrevious(false)}
            canPrevious={previous}
          />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Organization/Audit",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es", onFilter: fn(), onRetry: fn() },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "ready",
        "empty",
        "filteredEmpty",
        "loading",
        "error",
        "denied",
        "refreshError",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <AuditStory key={`${args.scenario}-${args.locale}-${args.competition}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ReadOnly: Story = {
  name: "Historial de decisiones",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "Historial de auditoría" });
    await expect(within(table).getByText("Sanción revocada")).toBeVisible();
    await expect(within(table).getByText("Rol de organización cambiado")).toBeVisible();
    await expect(within(table).getByText("Actor no registrado")).toBeVisible();
    await expect(within(table).queryByRole("button")).toBeNull();
  },
};

export const Competition: Story = {
  name: "Auditoría de competición",
  args: { competition: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("navigation", { name: "Vistas de la competición" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "Competición" })).toBeNull();
  },
};

export const Filters: Story = {
  name: "Aplicar filtros",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("combobox", { name: "Actor" }), "actor-organizer");
    await userEvent.click(canvas.getByRole("button", { name: "Aplicar filtros" }));
    await expect(args.onFilter).toHaveBeenCalledWith({ actorId: "actor-organizer" });
    await userEvent.click(canvas.getByRole("button", { name: "Siguiente" }));
    await expect(canvas.getByRole("button", { name: "Anterior" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Quitar filtros" }));
    await expect(canvas.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Actor" })).toHaveValue("");
  },
};

export const Empty: Story = { name: "Sin actividad", args: { scenario: "empty" } };
export const FilteredEmpty: Story = {
  name: "Sin coincidencias",
  args: { scenario: "filteredEmpty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Sin resultados con estos filtros")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Quitar filtros" }));
    await expect(canvas.getByRole("table", { name: "Historial de auditoría" })).toBeVisible();
  },
};
export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const Denied: Story = { name: "Sin permiso", args: { scenario: "denied" } };
export const Error: Story = {
  name: "Error con recuperación",
  args: { scenario: "error" },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Reintentar" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
export const RefreshError: Story = {
  name: "Error al actualizar",
  args: { scenario: "refreshError" },
};
export const NarrowSpanish: Story = { name: "Historial · ES 360", args: { narrow: true } };
export const NarrowEnglish: Story = {
  name: "History · EN 360",
  args: { narrow: true, locale: "en" },
};
