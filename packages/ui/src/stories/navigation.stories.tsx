import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/breadcrumb.js";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "../components/tabs.js";

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
