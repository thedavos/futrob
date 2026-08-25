"use client";

import { useState } from "react";
import { EA_SEARCH_PLATFORM, type ExternalClubDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
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
  typography,
  readFormString,
} from "@futrob/ui";
import { colors, media } from "@futrob/ui/styles/public.stylex";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "./game-data-browser-client.ts";
import { eaPlatformLabel, eaSearchPlatforms } from "./ea-club-search-meta.ts";
import { useSearchClubsMutation } from "./game-data-queries.ts";

type ClubSearchValues = {
  query: string;
  platform: string;
};

type ClubSearchField = keyof ClubSearchValues;

const styles = stylex.create({
  panel: {
    overflow: "hidden",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
    paddingBlock: "1rem",
  },
  eyebrow: {
    color: colors.mutedForeground,
  },
  title: {
    marginTop: "0.25rem",
  },
  live: {
    borderRadius: "var(--corner-full)",
    backgroundColor: colors.muted,
    paddingInline: "0.75rem",
    paddingBlock: "0.25rem",
    color: colors.mutedForeground,
  },
  form: {
    display: "grid",
    gap: "0.75rem",
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
    paddingBlock: "1.25rem",
  },
  submit: {
    width: {
      default: "100%",
      [media.sm]: "auto",
    },
  },
  results: {
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: colors.muted,
    paddingInline: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
    paddingBlock: "1rem",
  },
  empty: {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.mutedForeground,
  },
  list: {
    display: "grid",
    gap: "0.5rem",
  },
  item: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
    paddingInline: "0.75rem",
    paddingBlock: "0.5rem",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.75rem",
  },
  avatar: {
    width: "2rem",
    height: "2rem",
  },
  nameBlock: {
    minWidth: 0,
  },
  name: {
    fontSize: {
      default: "0.875rem",
      [media.sm]: "1rem",
    },
    lineHeight: {
      default: "1.25rem",
      [media.sm]: "1.5rem",
    },
  },
  meta: {
    marginTop: "0.125rem",
    color: colors.mutedForeground,
  },
  clubId: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    color: colors.mutedForeground,
  },
  source: {
    color: colors.mutedForeground,
  },
});

export function ClubSearchPanel() {
  const { t } = useI18n();
  const [clubs, setClubs] = useState<ExternalClubDto[]>([]);
  const [error, setError] = useState<SupportError | null>(null);
  const [searched, setSearched] = useState(false);
  const validation = useFormValidation<ClubSearchField>();
  const searchClubs = useSearchClubsMutation();
  const retry = useRetryAfterCountdown();
  const loading = searchClubs.isPending;
  const form = applyStyles(styles.form);
  const submit = applyStyles(styles.submit);
  const avatar = applyStyles(styles.avatar);

  async function handleSubmit(formValues: ClubSearchValues) {
    if (loading || retry.blocked) {
      return;
    }

    const trimmed = formValues.query.trim();
    const platform = formValues.platform || EA_SEARCH_PLATFORM.NINTENDO;

    setError(null);
    validation.clearServerErrors();

    try {
      const result = await searchClubs.mutateAsync({
        query: trimmed,
        platform,
      });
      setClubs(result.clubs);
      setSearched(true);
    } catch (cause) {
      setClubs([]);
      setSearched(true);
      if (GameDataClientError.is(cause)) {
        retry.start(cause.retryAfterSeconds);
        setError({
          message: cause.retryAfterSeconds
            ? "Alcanzaste el límite temporal de búsquedas."
            : "No pudimos buscar clubs. Inténtalo nuevamente.",
          requestId: cause.requestId,
          retryAfterSeconds: cause.retryAfterSeconds,
        });
      } else {
        setError({ message: "No pudimos buscar clubs. Inténtalo nuevamente." });
      }
    }
  }

  return (
    <div {...applyStyles(styles.panel)}>
      <div {...applyStyles(styles.header)}>
        <div>
          <p {...applyStyles(typography.label, styles.eyebrow)}>Game data · EA Clubs</p>
          <h2 {...applyStyles(typography.heading, styles.title)}>Buscar clubs</h2>
        </div>
        <span {...applyStyles(typography.label, styles.live)}>Live API</span>
      </div>

      <Form<ClubSearchValues>
        aria-busy={loading}
        className={form.className}
        errors={validation.formErrors}
        onFormSubmit={handleSubmit}
        style={form.style}
      >
        <Field
          {...validation.getFieldValidationProps("query")}
          disabled={loading}
          name="query"
          validate={(value) =>
            readFormString(value).trim().length === 0 ? "Escribe el nombre del club." : null
          }
        >
          <FieldLabel>Nombre del club</FieldLabel>
          <Input autoComplete="off" disabled={loading} name="query" placeholder="Ej. Cuervos" />
          <FieldError />
        </Field>

        <Field
          {...validation.getFieldValidationProps("platform")}
          disabled={loading}
          name="platform"
        >
          <FieldLabel>Plataforma</FieldLabel>
          <Select
            defaultValue={EA_SEARCH_PLATFORM.NINTENDO}
            disabled={loading}
            items={[...eaSearchPlatforms]}
            name="platform"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eaSearchPlatforms.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Button
          className={submit.className}
          disabled={loading || retry.blocked}
          style={submit.style}
          type="submit"
        >
          {loading
            ? "Buscando…"
            : retry.blocked
              ? `Reintentar en ${retry.remainingSeconds} s`
              : "Buscar"}
        </Button>
      </Form>

      <div {...applyStyles(styles.results)}>
        {error ? (
          <SupportErrorAlert
            error={{
              ...error,
              retryAfterSeconds: retry.remainingSeconds || undefined,
            }}
          />
        ) : null}

        {!error && searched && clubs.length === 0 ? (
          <p {...applyStyles(styles.empty)}>Sin resultados para esa búsqueda.</p>
        ) : null}

        {!error && clubs.length > 0 ? (
          <ul {...applyStyles(styles.list)}>
            {clubs.map((club) => (
              <li key={`${club.providerKey}:${club.externalClubId}`} {...applyStyles(styles.item)}>
                <div {...applyStyles(styles.identity)}>
                  <Avatar className={avatar.className} style={avatar.style}>
                    {club.imageUrl ? <AvatarImage alt="" src={club.imageUrl} /> : null}
                    <AvatarFallback>{initialsFromName(club.name)}</AvatarFallback>
                  </Avatar>
                  <div {...applyStyles(styles.nameBlock)}>
                    <strong {...applyStyles(styles.name)}>{club.name}</strong>
                    <p {...applyStyles(typography.label, styles.meta)}>
                      {eaPlatformLabel(club.platform)} · {club.gameEdition}
                    </p>
                  </div>
                </div>
                <span {...applyStyles(styles.clubId)}>{club.externalClubId}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {!searched && !error ? (
          <p {...applyStyles(typography.caption, styles.source)}>
            {t("gameData.clubSearch.source")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
