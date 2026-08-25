import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";

import { Button } from "../button";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "./page-header.tsx";

const styles = stylex.create({
  header: {
    width: "100%",
    maxWidth: "64rem",
  },
});

const meta = {
  title: "Primitives/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <PageHeader {...applyProps(undefined, undefined, styles.header)}>
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const TitleOnly: Story = {
  name: "Title only",
  render: () => (
    <PageHeader {...applyProps(undefined, undefined, styles.header)}>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
    </PageHeader>
  ),
};

export const WithDescription: Story = {
  name: "With description",
  render: () => (
    <PageHeader {...applyProps(undefined, undefined, styles.header)}>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const LargeTitle: Story = {
  name: "Large title",
  render: () => (
    <PageHeader {...applyProps(undefined, undefined, styles.header)}>
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle size="lg">Tu espacio de jugador</PageHeaderTitle>
      <PageHeaderDescription>
        Consulta tus partidos y estadísticas individuales sin pertenecer todavía a una organización.
      </PageHeaderDescription>
    </PageHeader>
  ),
};

export const WithEyebrowAndActions: Story = {
  name: "With eyebrow and actions",
  render: () => (
    <PageHeader {...applyProps(undefined, undefined, styles.header)}>
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle>davos282</PageHeaderTitle>
      <PageHeaderDescription>
        Delantero · 28 partidos jugados. Tú como jugador.
      </PageHeaderDescription>
      <PageHeaderActions>
        <Button variant="link">Volver al espacio personal</Button>
      </PageHeaderActions>
    </PageHeader>
  ),
};
