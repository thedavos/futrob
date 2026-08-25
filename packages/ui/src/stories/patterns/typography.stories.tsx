import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

import { Body } from "../../components/body/body.tsx";
import { Caption } from "../../components/caption/caption.tsx";
import { Display } from "../../components/display/display.tsx";
import { Eyebrow } from "../../components/eyebrow/eyebrow.tsx";
import { Heading } from "../../components/heading/heading.tsx";
import { MetaItem, MetaList, MetaTerm, MetaValue } from "../../components/meta-list/meta-list.tsx";
import { Score } from "../../components/score/score.tsx";
import { SectionTitle } from "../../components/section-title/section-title.tsx";
import { Subtitle } from "../../components/subtitle/subtitle.tsx";
import { Text } from "../../components/text/text.tsx";
import { TextLink } from "../../components/text-link/text-link.tsx";

const styles = stylex.create({
  stack: {
    display: "grid",
    maxWidth: "42rem",
    gap: "1.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "2rem",
  },
  group: {
    display: "grid",
    gap: "0.35rem",
  },
  scoreRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
  },
});

const meta = {
  title: "Patterns/Typography",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.stack)}>
      <div {...applyProps(undefined, undefined, styles.group)}>
        <Caption>Marketing</Caption>
        <Display>Competiciones claras</Display>
        <Subtitle>Oficializa resultados de FC Clubs sin mezclar el dato del proveedor.</Subtitle>
      </div>
      <div {...applyProps(undefined, undefined, styles.group)}>
        <Eyebrow>Espacio personal</Eyebrow>
        <Heading>Jornada 4</Heading>
        <Subtitle>Grupo A · ida</Subtitle>
        <Body measure>
          Revisa los candidatos sincronizados y{" "}
          <TextLink href="#seleccion">confirma la selección oficial</TextLink>. La tabla pública no
          cambia hasta que apruebas el resultado.
        </Body>
        <Caption>Sincronizado hace 12 minutos</Caption>
        <Body size="lg">
          Cuerpo holgado (16px) cuando el párrafo de 14px se queda corto.{" "}
          <Text as="strong" look="label">
            Text
          </Text>{" "}
          cubre un rol puntual en línea.
        </Body>
      </div>
      <div {...applyProps(undefined, undefined, styles.group)}>
        <SectionTitle>Datos del encuentro</SectionTitle>
        <MetaList columns={2}>
          <MetaItem>
            <MetaTerm>Tipo</MetaTerm>
            <MetaValue>Clubs</MetaValue>
          </MetaItem>
          <MetaItem>
            <MetaTerm>Posesión</MetaTerm>
            <MetaValue>
              <Score as="span">47%</Score>
            </MetaValue>
          </MetaItem>
        </MetaList>
      </div>
      <div {...applyProps(undefined, undefined, styles.scoreRow)}>
        <Heading as="h3">Nova FC vs Atlas</Heading>
        <Score align="end">2–1</Score>
      </div>
    </div>
  ),
};
