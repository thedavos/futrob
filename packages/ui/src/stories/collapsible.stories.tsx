import type { Meta, StoryObj } from "@storybook/react-vite";
import { CaretRightIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/collapsible";

const styles = stylex.create({
  playground: {
    width: "min(24rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.75rem",
  },
  trigger: {
    borderWidth: 0,
    paddingInline: "0.5rem",
    backgroundColor: {
      default: null,
      ":hover": colors.muted,
    },
  },
  triggerDisabled: {
    borderWidth: 0,
    paddingInline: "0.5rem",
  },
  caret: {
    width: "1rem",
    height: "1rem",
    color: colors.mutedForeground,
    transitionProperty: "transform",
    transitionDuration: "var(--duration-normal)",
    transform: {
      default: null,
      ":is([data-panel-open] *)": "rotate(90deg)",
    },
  },
  caretStatic: {
    width: "1rem",
    height: "1rem",
    color: colors.mutedForeground,
  },
  body: {
    display: "grid",
    gap: "0.5rem",
    paddingInline: "0.5rem",
    paddingBlock: "0.75rem",
  },
  foreground: { color: colors.foreground },
  muted: { color: colors.mutedForeground },
  captionPad: {
    paddingInline: "0.5rem",
    paddingBlock: "0.75rem",
    color: colors.mutedForeground,
  },
  sections: {
    display: "grid",
    width: "min(28rem, calc(100vw - 2rem))",
    gap: "0.75rem",
  },
  section: {
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "0.5rem",
  },
});

const meta = {
  title: "Primitives/Collapsible",
  component: Collapsible,
  parameters: { layout: "centered" },
  args: {
    defaultOpen: false,
    disabled: false,
  },
  argTypes: {
    defaultOpen: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Collapsible {...args} {...applyHost(undefined, undefined, styles.playground)}>
      <CollapsibleTrigger {...applyHost(undefined, undefined, typography.label, styles.trigger)}>
        Candidatos EA
        <CaretRightIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.caret)} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div {...applyHost(undefined, undefined, styles.body)}>
          <p {...applyHost(undefined, undefined, typography.body, styles.foreground)}>
            Real Nova vs Atlético Sur · 2-1
          </p>
          <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
            Revisa sides, duración y jugadores clave antes de proponer.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  ),
};

export const Sections: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.sections)}>
      {(
        [
          ["Resumen", "Marcador, jornada y estado del enfrentamiento."],
          ["Partidos oficiales", "Slots 1 y 2 con resultado aprobado o pendiente."],
          ["Candidatos EA", "Observaciones del proveedor listas para selección."],
        ] as const
      ).map(([title, body]) => (
        <Collapsible key={title} {...applyHost(undefined, undefined, styles.section)}>
          <CollapsibleTrigger
            {...applyHost(undefined, undefined, typography.label, styles.trigger)}
          >
            {title}
            <CaretRightIcon aria-hidden="true" {...applyHost(undefined, undefined, styles.caret)} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p {...applyHost(undefined, undefined, typography.caption, styles.captionPad)}>
              {body}
            </p>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Collapsible disabled {...applyHost(undefined, undefined, styles.playground)}>
      <CollapsibleTrigger
        {...applyHost(undefined, undefined, typography.label, styles.triggerDisabled)}
      >
        Historial (sin permiso)
        <CaretRightIcon
          aria-hidden="true"
          {...applyHost(undefined, undefined, styles.caretStatic)}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p {...applyHost(undefined, undefined, typography.caption, styles.captionPad)}>
          Solo el staff autorizado puede auditar este historial.
        </p>
      </CollapsibleContent>
    </Collapsible>
  ),
};
