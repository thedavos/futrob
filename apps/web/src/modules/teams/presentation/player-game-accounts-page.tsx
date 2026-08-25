"use client";

import { useState } from "react";
import * as stylex from "@stylexjs/stylex";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldLabel,
  Form,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  readFormString,
  typography,
} from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { Link } from "@tanstack/react-router";
import type { GamePlatformDto } from "@futrob/api-contracts";
import { GAME_PLATFORM_VALUES } from "@futrob/shared-kernel";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useAddMyGameAccountMutation, useMyPlayerProfileQuery } from "./player-queries.ts";

const styles = stylex.create({
  main: {
    width: "100%",
  },
  header: {
    marginBottom: "2rem",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
  },
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  alert: {
    marginBottom: "1.5rem",
  },
  form: {
    display: "grid",
    gap: "1.25rem",
  },
  pair: {
    display: "grid",
    gap: "1.25rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
  submit: {
    width: {
      default: "100%",
      [media.sm]: "fit-content",
    },
  },
  linked: {
    marginTop: "2rem",
  },
  linkedTitle: {
    marginBottom: "1rem",
    fontSize: "1.125rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  linkedEmpty: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  list: {
    overflow: "hidden",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  item: {
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    borderTopWidth: {
      default: 1,
      ":first-child": 0,
    },
    borderTopStyle: "solid",
    borderTopColor: colors.borderSubtle,
  },
  identifier: {
    fontWeight: 600,
  },
});

const alert = applyStyles(styles.alert);
const form = applyStyles(styles.form);
const submit = applyStyles(styles.submit);

const GAME_PLATFORMS = GAME_PLATFORM_VALUES;

type AddGameAccountValues = {
  identifier: string;
  platform: string;
  gameEdition: string;
};

type AddGameAccountField = keyof AddGameAccountValues;

function isGamePlatform(value: string): value is GamePlatformDto {
  return GAME_PLATFORMS.some((platform) => platform === value);
}

export function PlayerGameAccountsPage() {
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const validation = useFormValidation<AddGameAccountField>();
  const profileQuery = useMyPlayerProfileQuery();
  const addAccount = useAddMyGameAccountMutation();

  const accounts = profileQuery.data?.gameAccounts ?? [];
  const loading = profileQuery.isPending;
  const submitting = addAccount.isPending;

  async function handleSubmit(formValues: AddGameAccountValues) {
    const identifier = formValues.identifier.trim();
    const gameEdition = formValues.gameEdition.trim();
    const platform = formValues.platform;

    if (!isGamePlatform(platform)) {
      validation.applyServerErrors({ platform: "Selecciona una plataforma." });
      return;
    }

    setError(null);
    validation.clearServerErrors();

    try {
      await addAccount.mutateAsync({
        identifier,
        platform,
        gameEdition,
      });
      setFormKey((current) => current + 1);
      validation.clearServerErrors();
    } catch {
      setError("No se pudo guardar la cuenta. Inténtalo de nuevo.");
    }
  }

  return (
    <main {...applyStyles(styles.main)}>
      <div {...applyStyles(styles.header)}>
        <div {...applyStyles(styles.intro)}>
          <p {...applyStyles(typography.label, styles.muted)}>Espacio personal</p>
          <h1 {...applyStyles(typography.heading)}>Datos de juego</h1>
          <p {...applyStyles(typography.subtitle, styles.muted)}>
            Registra tus identificadores de EA sin compartir credenciales. Futrob los usará para
            localizar tus partidos y estadísticas.
          </p>
        </div>
        <Button render={<Link to="/player" />} variant="link">
          Volver al espacio personal
        </Button>
      </div>

      {error || profileQuery.isError ? (
        <Alert className={alert.className} style={alert.style} variant="destructive">
          <AlertDescription>
            {error ?? "No se pudieron cargar tus cuentas de juego."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Añadir cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <Form<AddGameAccountValues>
            aria-busy={submitting}
            className={form.className}
            errors={validation.formErrors}
            key={formKey}
            onFormSubmit={handleSubmit}
            style={form.style}
          >
            <Field
              {...validation.getFieldValidationProps("identifier")}
              disabled={submitting}
              name="identifier"
              validate={(value) =>
                readFormString(value).trim().length === 0 ? "Escribe el identificador de EA." : null
              }
            >
              <FieldLabel htmlFor="player-account-identifier">Identificador de EA</FieldLabel>
              <Input
                disabled={submitting}
                id="player-account-identifier"
                maxLength={80}
                name="identifier"
              />
              <FieldError />
            </Field>
            <div {...applyStyles(styles.pair)}>
              <Field
                {...validation.getFieldValidationProps("platform")}
                disabled={submitting}
                name="platform"
                validate={(value) =>
                  readFormString(value).length === 0 ? "Selecciona una plataforma." : null
                }
              >
                <FieldLabel htmlFor="player-account-platform">Plataforma</FieldLabel>
                <Select disabled={submitting} name="platform">
                  <SelectTrigger id="player-account-platform">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playstation">PlayStation</SelectItem>
                    <SelectItem value="xbox">Xbox</SelectItem>
                    <SelectItem value="pc">PC</SelectItem>
                    <SelectItem value="nintendo-switch-1">Nintendo Switch 1</SelectItem>
                    <SelectItem value="nintendo-switch-2">Nintendo Switch 2</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError />
              </Field>
              <Field
                {...validation.getFieldValidationProps("gameEdition")}
                disabled={submitting}
                name="gameEdition"
                validate={(value) =>
                  readFormString(value).trim().length === 0 ? "Escribe la edición." : null
                }
              >
                <FieldLabel htmlFor="player-account-edition">Edición</FieldLabel>
                <Input
                  disabled={submitting}
                  id="player-account-edition"
                  maxLength={40}
                  name="gameEdition"
                  placeholder="ej. FC 26"
                />
                <FieldError />
              </Field>
            </div>
            <Button
              className={submit.className}
              disabled={submitting}
              style={submit.style}
              type="submit"
            >
              {submitting ? "Guardando…" : "Añadir cuenta"}
            </Button>
          </Form>
        </CardContent>
      </Card>

      <section {...applyStyles(styles.linked)}>
        <h2 {...applyStyles(styles.linkedTitle)}>Cuentas vinculadas</h2>
        {loading ? (
          <p {...applyStyles(styles.linkedEmpty)}>Cargando cuentas…</p>
        ) : accounts.length === 0 ? (
          <p {...applyStyles(styles.linkedEmpty)}>Todavía no vinculaste ninguna cuenta.</p>
        ) : (
          <div {...applyStyles(styles.list)}>
            {accounts.map((account) => (
              <div key={account.id} {...applyStyles(styles.item)}>
                <div>
                  <p {...applyStyles(styles.identifier)}>{account.identifier}</p>
                  <p {...applyStyles(typography.caption, styles.muted)}>
                    {platformLabel(account.platform)} · {account.gameEdition}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function platformLabel(platform: GamePlatformDto): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}
