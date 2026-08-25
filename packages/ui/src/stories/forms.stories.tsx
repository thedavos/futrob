import type { Meta, StoryObj } from "@storybook/react-vite";
import { WarningCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

import { Alert, AlertDescription, AlertTitle } from "../components/alert";
import { Button } from "../components/button";
import { Checkbox } from "../components/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "../components/field";
import { Form } from "../components/form";
import { Input } from "../components/input";
import { readFormString } from "../lib/read-form-string";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";
import { Textarea } from "../components/textarea";

const styles = stylex.create({
  form: {
    display: "grid",
    width: "min(32rem, calc(100vw - 2rem))",
    gap: "1.25rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  eyebrow: { color: colors.primary },
  title: {
    marginTop: "0.25rem",
    fontSize: "var(--text-xl)",
    fontWeight: 600,
  },
  audit: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    fontSize: "var(--text-sm)",
    lineHeight: 1.625,
  },
  auditHint: {
    display: "block",
    color: colors.mutedForeground,
  },
  actions: {
    display: "flex",
    flexDirection: {
      default: "column-reverse",
      [media.sm]: "row",
    },
    justifyContent: {
      default: null,
      [media.sm]: "flex-end",
    },
    gap: "0.5rem",
  },
  status: {
    display: "grid",
    width: "min(32rem, calc(100vw - 2rem))",
    gap: "1.25rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  dense: {
    display: "grid",
    width: "min(32rem, calc(100vw - 2rem))",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.25rem",
  },
});

const meta = {
  title: "Patterns/Forms",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteForm: Story = {
  render: () => (
    <Form
      onFormSubmit={() => undefined}
      validationMode="onBlur"
      {...applyHost(undefined, undefined, styles.form)}
    >
      <div>
        <p {...applyHost(undefined, undefined, typography.label, styles.eyebrow)}>Configuración</p>
        <h2 {...applyHost(undefined, undefined, styles.title)}>Crear competición</h2>
      </div>
      <Field
        name="name"
        validate={(value) =>
          readFormString(value).trim().length === 0 ? "Este campo es obligatorio." : null
        }
      >
        <FieldLabel>Nombre</FieldLabel>
        <Input placeholder="Liga Metropolitana" />
        <FieldDescription>Será visible para capitanes y jugadores.</FieldDescription>
        <FieldError />
      </Field>
      <Field name="format">
        <FieldLabel>Formato</FieldLabel>
        <Select defaultValue="league" required>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="league">Liga</SelectItem>
            <SelectItem value="cup">Copa</SelectItem>
            <SelectItem value="groups">Grupos + eliminación</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field name="notes">
        <FieldLabel>Notas operativas</FieldLabel>
        <Textarea placeholder="Criterios, horarios o excepciones…" />
      </Field>
      <label htmlFor="audit-checkbox" {...applyHost(undefined, undefined, styles.audit)}>
        <Checkbox defaultChecked id="audit-checkbox" name="audit" />
        <span>
          Exigir auditoría antes de oficializar resultados
          <span {...applyHost(undefined, undefined, styles.auditHint)}>
            El staff deberá revisar las estadísticas importadas.
          </span>
        </span>
      </label>
      <div {...applyHost(undefined, undefined, styles.actions)}>
        <Button type="button" variant="ghost">
          Cancelar
        </Button>
        <Button type="submit">Crear competición</Button>
      </div>
    </Form>
  ),
};

export const ValidationAndStatus: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.status)}>
      <Field invalid name="team-code">
        <FieldLabel>Código del equipo</FieldLabel>
        <Input aria-invalid="true" defaultValue="@@@" />
        <FieldError match>Usa entre 3 y 12 letras o números.</FieldError>
      </Field>
      <Alert variant="warning">
        <WarningCircleIcon />
        <AlertTitle>Datos incompletos</AlertTitle>
        <AlertDescription>Dos jugadores todavía no vincularon su cuenta de EA.</AlertDescription>
      </Alert>
    </div>
  ),
};

export const DenseOperatorForm: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.dense)}>
      <Field>
        <FieldLabel>Jornada</FieldLabel>
        <Input defaultValue="12" dense type="number" />
      </Field>
      <Field>
        <FieldLabel>Cancha</FieldLabel>
        <Select defaultValue="a">
          <SelectTrigger dense>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Cancha A</SelectItem>
            <SelectItem value="b">Cancha B</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  ),
};
