import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/breadcrumb";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../components/tabs";

const meta = {
  title: "Patterns/Navigation",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompetitionNavigation: Story = {
  render: () => (
    <div className="w-[min(46rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-6">
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
      <Tabs className="mt-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="matches">Partidos</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
          <TabsIndicator />
        </TabsList>
        <TabsContent value="overview">
          <p className="text-sm text-muted-foreground">
            Estado operativo, alertas y próximos partidos de la competición.
          </p>
        </TabsContent>
        <TabsContent value="matches">
          <p className="text-sm text-muted-foreground">Calendario y resultados por jornada.</p>
        </TabsContent>
        <TabsContent value="statistics">
          <p className="text-sm text-muted-foreground">
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
    <div className="w-[min(46rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-6">
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
          <p className="text-sm text-muted-foreground">Apariciones de los últimos 7 días.</p>
        </TabsContent>
        <TabsContent value="league">
          <p className="text-sm text-muted-foreground">Partidos de liga.</p>
        </TabsContent>
        <TabsContent value="playoff">
          <p className="text-sm text-muted-foreground">Partidos de playoff.</p>
        </TabsContent>
        <TabsContent value="friendly">
          <p className="text-sm text-muted-foreground">Partidos amistosos.</p>
        </TabsContent>
        <TabsContent value="all">
          <p className="text-sm text-muted-foreground">Todas las apariciones.</p>
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
