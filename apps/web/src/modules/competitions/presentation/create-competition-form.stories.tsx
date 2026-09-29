import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, userEvent, waitFor, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import {
  competitionsStoryRequests,
  resetCompetitionsStoryRequests,
} from "@/modules/competitions/presentation/competitions-story-client.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { CreateCompetitionForm } from "./create-competition-form.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    maxWidth: "48rem",
    backgroundColor: colors.background,
    paddingInline: "1.5rem",
    paddingBlock: "1.5rem",
  },
});

const ORG = "org-story";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function CreateStoryShell() {
  const client = useMemo(() => {
    resetCompetitionsStoryRequests();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(
      queryKeys.authorization.effectiveAccess({ organizationId: ORG }, [
        COMPETITION_PERMISSION.update,
      ]),
      {
        actorId: "actor-story",
        scope: { organizationId: ORG },
        roles: [],
        permissions: [
          { permission: COMPETITION_PERMISSION.update, allowed: true, decidedAt: "organization" },
        ],
      },
    );
    return queryClient;
  }, []);
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const newRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/new",
      component: () => <CreateCompetitionForm organizationId={ORG} />,
    });
    const setupRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/setup",
      component: () => <p>Configuración creada</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([newRoute, setupRoute]),
      history: createMemoryHistory({ initialEntries: [`/orgs/${ORG}/competitions/new`] }),
    });
  }, []);
  return (
    <QueryClientProvider client={client}>
      <div {...applyProps(undefined, undefined, styles.frame)}>
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Organizer/Competitions/Create",
  parameters: { layout: "fullscreen" },
  render: () => <CreateStoryShell />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function fillIdentity(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const body = within(canvasElement.ownerDocument.body);
  await userEvent.type(await canvas.findByLabelText("Nombre de la competición"), "Copa Story");
  await userEvent.click(canvas.getByRole("radio", { name: /PlayStation/ }));
  await userEvent.click(canvas.getByRole("combobox", { name: "Región deportiva" }));
  await userEvent.click(await body.findByRole("option", { name: "Sudamérica" }));
  await userEvent.click(canvas.getByRole("combobox", { name: "Formato" }));
  await userEvent.click(await body.findByRole("option", { name: "Eliminación directa" }));
}

export const DefaultCover: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillIdentity(canvasElement);
    await expect(canvas.getByRole("radio", { name: "Copa" })).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Crear competición" }));
    await expect(await canvas.findByText("Configuración creada")).toBeVisible();
    await expect(competitionsStoryRequests().lastCreateInput).toMatchObject({
      name: "Copa Story",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
    });
  },
};

export const UploadedCover: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillIdentity(canvasElement);
    await userEvent.clear(canvas.getByLabelText("Mínimo de equipos"));
    await userEvent.type(canvas.getByLabelText("Mínimo de equipos"), "4");
    await userEvent.type(canvas.getByLabelText("Máximo de equipos"), "8");
    await userEvent.click(canvas.getByRole("radio", { name: "Liga" }));
    await expect(canvas.getByRole("radio", { name: "Liga" })).toBeChecked();

    await userEvent.upload(
      canvas.getByLabelText("Subir imagen de portada"),
      new File([PNG_BYTES], "portada.png", { type: "image/png" }),
    );
    await expect(await canvas.findByAltText("Vista previa de la portada")).toBeVisible();
    await expect(canvas.getByRole("radio", { name: "Liga" })).not.toBeChecked();

    await userEvent.click(canvas.getByRole("button", { name: "Crear competición" }));
    await expect(await canvas.findByText("Configuración creada")).toBeVisible();
    const { lastCreateInput, uploadedCovers } = competitionsStoryRequests();
    await expect(uploadedCovers).toHaveLength(1);
    await expect(uploadedCovers[0]).toMatch(/^competition-covers\/org-story\/[\w-]+\.png$/);
    await expect(lastCreateInput).toMatchObject({
      teams: { min: 4, max: 8 },
      cover: { kind: "upload", key: uploadedCovers[0] },
    });
    await expect(lastCreateInput?.creationKey).toBe(
      uploadedCovers[0]?.replace("competition-covers/org-story/", "").replace(".png", ""),
    );
  },
};

export const RemoveUploadedCover: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.upload(
      await canvas.findByLabelText("Subir imagen de portada"),
      new File([PNG_BYTES], "portada.png", { type: "image/png" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Quitar imagen" }));
    await expect(canvas.queryByAltText("Vista previa de la portada")).toBeNull();
    await expect(canvas.getByRole("radio", { name: "Copa" })).toBeChecked();
  },
};

export const InvalidTeamRange: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fillIdentity(canvasElement);
    await userEvent.clear(canvas.getByLabelText("Mínimo de equipos"));
    await userEvent.type(canvas.getByLabelText("Mínimo de equipos"), "8");
    await userEvent.type(canvas.getByLabelText("Máximo de equipos"), "4");
    await userEvent.click(canvas.getByRole("button", { name: "Crear competición" }));
    await expect(
      await canvas.findByText("El máximo debe ser igual o mayor que el mínimo."),
    ).toBeVisible();
    await waitFor(() => expect(competitionsStoryRequests().lastCreateInput).toBeNull());
  },
};
