import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyHost } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/breadcrumb";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../components/tabs";

const styles = stylex.create({
  panel: {
    width: "min(46rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  tabs: {
    marginTop: "1.5rem",
  },
  muted: {
    fontSize: "var(--text-sm)",
    color: colors.mutedForeground,
  },
});

const meta = {
  title: "Patterns/Navigation",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompetitionNavigation: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Organizaciones</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Futrob Masters</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Temporada 4</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Tabs defaultValue="overview" {...applyHost(undefined, undefined, styles.tabs)}>
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
          <TabsIndicator />
        </TabsList>
        <TabsContent value="overview">
          <p {...applyHost(undefined, undefined, styles.muted)}>
            Estado operativo, alertas y próximos partidos de la competición.
          </p>
        </TabsContent>
        <TabsContent value="matches">
          <p {...applyHost(undefined, undefined, styles.muted)}>
            Calendario y resultados por jornada.
          </p>
        </TabsContent>
        <TabsContent value="statistics">
          <p {...applyHost(undefined, undefined, styles.muted)}>
            Gráficos, líderes y auditoría de estadísticas.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  ),
};

export const PillsTabs: Story = {
  name: "Tabs pills",
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <Tabs defaultValue="recent" variant="pills">
        <TabsList>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
          <TabsTrigger value="league">Liga</TabsTrigger>
          <TabsTrigger value="playoff">Playoff</TabsTrigger>
          <TabsTrigger value="friendly">Amistosos</TabsTrigger>
          <TabsTrigger value="all">Todos los partidos</TabsTrigger>
          <TabsIndicator />
        </TabsList>
        <TabsContent value="recent">
          <p {...applyHost(undefined, undefined, styles.muted)}>
            Apariciones de los últimos 7 días.
          </p>
        </TabsContent>
        <TabsContent value="league">
          <p {...applyHost(undefined, undefined, styles.muted)}>Partidos de liga.</p>
        </TabsContent>
        <TabsContent value="playoff">
          <p {...applyHost(undefined, undefined, styles.muted)}>Partidos de playoff.</p>
        </TabsContent>
        <TabsContent value="friendly">
          <p {...applyHost(undefined, undefined, styles.muted)}>Partidos amistosos.</p>
        </TabsContent>
        <TabsContent value="all">
          <p {...applyHost(undefined, undefined, styles.muted)}>Todas las apariciones.</p>
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-slot='tabs']")).toHaveAttribute(
      "data-variant",
      "pills",
    );
    await expect(canvasElement.querySelector("[data-slot='tabs-indicator']")).toBeNull();
  },
};
