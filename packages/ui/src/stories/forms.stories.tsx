import type { Meta, StoryObj } from "@storybook/react-vite";
import { WarningCircleIcon } from "@phosphor-icons/react";

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
      className="grid w-[min(32rem,calc(100vw-2rem))] gap-5 rounded-xl border border-border bg-surface p-6"
      onFormSubmit={() => undefined}
      validationMode="onBlur"
    >
      <div>
        <p className="typo-label text-primary">Configuración</p>
        <h2 className="mt-1 text-xl font-semibold">Crear competición</h2>
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
      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <Checkbox defaultChecked name="audit" />
        <span>
          Exigir auditoría antes de oficializar resultados
          <span className="block text-muted-foreground">
            El staff deberá revisar las estadísticas importadas.
          </span>
        </span>
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    <div className="grid w-[min(32rem,calc(100vw-2rem))] gap-5 rounded-xl border border-border bg-surface p-6">
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
    <div className="grid w-[min(32rem,calc(100vw-2rem))] grid-cols-2 gap-3 rounded-xl border border-border bg-surface p-5">
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
