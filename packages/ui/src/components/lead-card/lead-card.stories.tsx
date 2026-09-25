import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnvelopeSimpleIcon, SoccerBallIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles } from "#styles/apply";

import { Caption } from "../caption/caption.tsx";
import { TextLink } from "../text-link/text-link.tsx";
import { LeadCard } from "./lead-card.tsx";

const ICON_SIZE = 32;

const styles = stylex.create({
  frame: {
    width: "20rem",
    maxWidth: "100%",
  },
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
  caption: {
    whiteSpace: "pre-line",
  },
});

const frame = applyStyles(styles.frame);
const icon = applyStyles(styles.icon);

const meta = {
  title: "Patterns/LeadCard",
  component: LeadCard,
  parameters: { layout: "padded" },
  args: {
    title: "Mis partidos",
    subtitle: "Tus partidos recientes y el historial del club seleccionado.",
    tone: "primary",
    icon: <SoccerBallIcon aria-hidden size={ICON_SIZE} {...icon} />,
  },
  argTypes: {
    tone: { control: "select", options: ["primary", "muted"] },
    icon: { control: false },
    action: { control: false },
    children: { control: false },
  },
} satisfies Meta<typeof LeadCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div {...frame}>
      <LeadCard {...args} />
    </div>
  ),
};

export const Primary: Story = {
  name: "Primary",
  render: () => (
    <div {...frame}>
      <LeadCard
        icon={<SoccerBallIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle="Tus partidos recientes y el historial del club seleccionado."
        title="Mis partidos"
      />
    </div>
  ),
};

export const Muted: Story = {
  name: "Muted",
  render: () => (
    <div {...frame}>
      <LeadCard
        icon={<EnvelopeSimpleIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle="Cuando un club te invite, podrás responder aquí."
        title="Sin invitaciones pendientes"
        tone="muted"
      />
    </div>
  ),
};

export const WithAction: Story = {
  name: "With action",
  render: () => (
    <div {...frame}>
      <LeadCard
        action={
          <TextLink href="#partidos" text="caption">
            Ver mis partidos
          </TextLink>
        }
        icon={<SoccerBallIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle="Tus partidos recientes y el historial del club seleccionado."
        title="Mis partidos"
      />
    </div>
  ),
};

export const WithExtraCopy: Story = {
  name: "With extra copy",
  render: () => (
    <div {...frame}>
      <LeadCard
        action={
          <TextLink href="#invitaciones" text="caption">
            Revisar invitaciones
          </TextLink>
        }
        icon={<EnvelopeSimpleIcon aria-hidden size={ICON_SIZE} {...icon} />}
        subtitle="2 invitaciones por responder"
        title="Invitaciones"
      >
        <Caption className={styles.caption}>
          Responde para unirte{"\n"}y jugar con otros clubes.
        </Caption>
      </LeadCard>
    </div>
  ),
};
