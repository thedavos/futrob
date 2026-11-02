import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

import { Body } from "../../components/body/body.tsx";
import { Caption } from "../../components/caption/caption.tsx";
import { Display } from "../../components/display/display.tsx";
import { Eyebrow } from "../../components/eyebrow/eyebrow.tsx";
import { Heading } from "../../components/heading/heading.tsx";
import { MetaItem, MetaList, MetaTerm, MetaValue } from "../../components/meta-list/meta-list.tsx";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "../../components/page-header/page-header.tsx";
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
  hierarchy: {
    display: "grid",
    maxWidth: "42rem",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "2rem",
  },
  level: {
    display: "grid",
    gridTemplateColumns: "8rem minmax(0, 1fr)",
    alignItems: "baseline",
    gap: "1rem",
  },
  flush: { marginBottom: 0 },
  tiers: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    maxWidth: "52rem",
  },
  tierPanel: {
    display: "grid",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    padding: "1.25rem",
  },
  onBackground: { backgroundColor: colors.background },
  onSurface: { backgroundColor: colors.surface },
  onRaised: { backgroundColor: colors.surfaceRaised },
  tierRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "0.75rem",
    margin: 0,
    fontSize: "var(--text-sm)",
  },
  primary: { color: colors.foreground },
  secondary: { color: colors.mutedForeground },
  tertiary: { color: colors.textTertiary },
  disabled: { color: colors.textDisabled },
  scoreRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "1rem",
  },
});

const meta = {
  title: "Foundations/Typography",
  tags: ["autodocs"],
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

/**
 * Each structural level steps down by size or weight, so nesting reads from type alone:
 * page h1 24/700 → panel h2 20/700 → card/sub-panel h3 18/600 → h4 14/600 → body 14/400.
 */
export const Hierarchy: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.hierarchy)}>
      <div {...applyProps(undefined, undefined, styles.level)}>
        <Caption>h1 · 24 / 700</Caption>
        <PageHeader className={styles.flush}>
          <PageHeaderTitle>Liga Metropolitana</PageHeaderTitle>
          <PageHeaderDescription>Temporada 2026 · 12 equipos</PageHeaderDescription>
        </PageHeader>
      </div>
      <div {...applyProps(undefined, undefined, styles.level)}>
        <Caption>h2 · 20 / 700</Caption>
        <Heading>Fase regular</Heading>
      </div>
      <div {...applyProps(undefined, undefined, styles.level)}>
        <Caption>h3 · 18 / 600</Caption>
        <Heading as="h3">Jornada 4</Heading>
      </div>
      <div {...applyProps(undefined, undefined, styles.level)}>
        <Caption>h4 · 14 / 600</Caption>
        <Heading as="h4">Nova FC vs Atlas</Heading>
      </div>
      <div {...applyProps(undefined, undefined, styles.level)}>
        <Caption>body · 14 / 400</Caption>
        <Body>El resultado cuenta para la tabla cuando lo apruebas.</Body>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const size = (selector: string) =>
      Number.parseFloat(getComputedStyle(canvasElement.querySelector(selector)!).fontSize);
    const weight = (selector: string) =>
      Number(getComputedStyle(canvasElement.querySelector(selector)!).fontWeight);
    await expect(size("h1")).toBeGreaterThan(size("h2"));
    await expect(size("h2")).toBeGreaterThan(size("h3"));
    await expect(size("h3")).toBeGreaterThan(size("h4"));
    await expect(weight("h4")).toBeGreaterThan(weight("[data-slot='body']"));
  },
};

const TIER_SURFACES = [
  { label: "background", style: styles.onBackground },
  { label: "surface", style: styles.onSurface },
  { label: "surface-raised", style: styles.onRaised },
] as const;

/**
 * Four text tiers. `text-tertiary` keeps AA on every surface; `text-disabled` marks inactive
 * UI only (WCAG 1.4.3 exempt) and replaces opacity dimming.
 */
export const TextTiers: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.tiers)}>
      {TIER_SURFACES.map((surface) => (
        <section
          aria-label={surface.label}
          key={surface.label}
          {...applyProps(undefined, undefined, styles.tierPanel, surface.style)}
        >
          <Caption>{surface.label}</Caption>
          <p {...applyProps(undefined, undefined, styles.tierRow, styles.primary)}>
            <span>Nova FC</span>
            <span>foreground</span>
          </p>
          <p {...applyProps(undefined, undefined, styles.tierRow, styles.secondary)}>
            <span>Goles a favor</span>
            <span>muted-foreground</span>
          </p>
          <p {...applyProps(undefined, undefined, styles.tierRow, styles.tertiary)}>
            <span>Hace 12 minutos</span>
            <span>text-tertiary</span>
          </p>
          <p {...applyProps(undefined, undefined, styles.tierRow, styles.disabled)}>
            <span>No disponible</span>
            <span>text-disabled</span>
          </p>
        </section>
      ))}
    </div>
  ),
};
