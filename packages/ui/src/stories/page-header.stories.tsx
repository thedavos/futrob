import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost } from "@futrob/ui";

import { Button } from "../components/button";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from "../components/page-header";

const styles = stylex.create({
  header: {
    width: "100%",
    maxWidth: "64rem",
  },
});

const meta = {
  title: "Patterns/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <PageHeader {...applyHost(undefined, undefined, styles.header)}>
      <PageHeaderEyebrow>Espacio personal</PageHeaderEyebrow>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const TitleOnly: Story = {
  name: "Title only",
  render: () => (
    <PageHeader {...applyHost(undefined, undefined, styles.header)}>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
    </PageHeader>
  ),
};

export const WithDescription: Story = {
  name: "With description",
  render: () => (
    <PageHeader {...applyHost(undefined, undefined, styles.header)}>
      <PageHeaderTitle>Mis partidos</PageHeaderTitle>
      <PageHeaderDescription>Apariciones en el club seleccionado.</PageHeaderDescription>
    </PageHeader>
  ),
};

export const WithEyebrowAndActions: Story = {
  name: "With eyebrow and actions",
  render: () => (
    <PageHeader {...applyHost(undefined, undefined, styles.header)}>
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
