import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../components/button";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "../components/page-header";

const meta = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <PageHeader className="w-full max-w-5xl">
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const TitleOnly: Story = {
  name: "Title only",
  render: () => (
    <PageHeader className="w-full max-w-5xl">
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
    </PageHeader>
  ),
};

export const WithDescription: Story = {
  name: "With description",
  render: () => (
    <PageHeader className="w-full max-w-5xl">
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const WithEyebrowAndActions: Story = {
  name: "With eyebrow and actions",
  render: () => (
    <PageHeader className="w-full max-w-5xl">
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle>Mis estadísticas</PageHeaderTitle>
      <PageHeaderDescription>
        Agregados individuales construidos únicamente desde resultados oficiales aprobados.
      </PageHeaderDescription>
      <PageHeaderActions>
        <Button variant="link">Volver al espacio personal</Button>
      </PageHeaderActions>
    </PageHeader>
  ),
};
