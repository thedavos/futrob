import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { Form } from "../components/form";
import { Label } from "../components/label";
import { Switch } from "../components/switch";

const styles = stylex.create({
  playground: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
  },
  panel: {
    display: "grid",
    width: "min(22rem, calc(100vw - 2rem))",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  labeled: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
  },
  copy: {
    display: "grid",
    gap: "0.25rem",
  },
  form: {
    width: "min(24rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  foreground: { color: colors.foreground },
  muted: { color: colors.mutedForeground },
});

const meta = {
  title: "Primitives/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  args: {
    defaultChecked: false,
    disabled: false,
  },
  argTypes: {
    defaultChecked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <label htmlFor="switch-playground" {...applyHost(undefined, undefined, styles.playground)}>
      <Switch id="switch-playground" {...args} />
      <span {...applyHost(undefined, undefined, typography.label, styles.foreground)}>
        Publicar portal
      </span>
    </label>
  ),
};

export const States: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <label htmlFor="switch-off" {...applyHost(undefined, undefined, styles.row)}>
        <span {...applyHost(undefined, undefined, typography.label, styles.foreground)}>
          Desactivado
        </span>
        <Switch id="switch-off" />
      </label>
      <label htmlFor="switch-on" {...applyHost(undefined, undefined, styles.row)}>
        <span {...applyHost(undefined, undefined, typography.label, styles.foreground)}>
          Activado
        </span>
        <Switch defaultChecked id="switch-on" />
      </label>
      <label htmlFor="switch-disabled" {...applyHost(undefined, undefined, styles.row)}>
        <span {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Deshabilitado
        </span>
        <Switch disabled id="switch-disabled" />
      </label>
      <label htmlFor="switch-on-disabled" {...applyHost(undefined, undefined, styles.row)}>
        <span {...applyHost(undefined, undefined, typography.label, styles.muted)}>
          Activado · deshabilitado
        </span>
        <Switch defaultChecked disabled id="switch-on-disabled" />
      </label>
      <label htmlFor="switch-invalid" {...applyHost(undefined, undefined, styles.row)}>
        <span {...applyHost(undefined, undefined, typography.label, styles.foreground)}>
          Inválido
        </span>
        <Switch aria-invalid id="switch-invalid" />
      </label>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.panel)}>
      <div {...applyHost(undefined, undefined, styles.labeled)}>
        <div {...applyHost(undefined, undefined, styles.copy)}>
          <Label htmlFor="notify-captains">Avisar a capitanes</Label>
          <p {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
            Envía un aviso cuando se proponga un resultado.
          </p>
        </div>
        <Switch defaultChecked id="notify-captains" />
      </div>
    </div>
  ),
};

export const InForm: Story = {
  render: () => (
    <Form {...applyHost(undefined, undefined, styles.form)}>
      <Field name="publishPortal">
        <div {...applyHost(undefined, undefined, styles.labeled)}>
          <div {...applyHost(undefined, undefined, styles.copy)}>
            <FieldLabel>Publicar portal</FieldLabel>
            <FieldDescription>
              El portal público solo muestra resultados oficiales aprobados.
            </FieldDescription>
          </div>
          <Switch name="publishPortal" />
        </div>
        <FieldError />
      </Field>
    </Form>
  ),
};
