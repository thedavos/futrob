"use client";

import { useState } from "react";
import {
  asEaSearchPlatform,
  EA_SEARCH_PLATFORM,
  type EaSearchPlatform,
  type ExternalClubDto,
} from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import {
  applyStyles,
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
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { useFormValidation } from "@/shared/presentation/forms/use-form-validation.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { useRetryAfterCountdown } from "@/shared/presentation/use-retry-after-countdown.ts";
import {
  SupportErrorAlert,
  type SupportError,
} from "@/shared/presentation/support-error-alert.tsx";
import { GameDataClientError } from "./game-data-browser-client.ts";
import { eaPlatformLabel, eaSearchPlatforms } from "./ea-club-search-meta.ts";
import { ClubSearchResultList } from "./club-search-result-item.tsx";
import { useSearchClubsMutation } from "./game-data-queries.ts";

type ClubSearchValues = {
  query: string;
  platform: string;
};

type ClubSearchField = keyof ClubSearchValues;

const styles = stylex.create({
  panel: {
    display: "grid",
    minWidth: 0,
    gap: "1rem",
  },
  form: {
    display: "grid",
    alignItems: "end",
    gap: "0.75rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr) auto",
      [media.sm]: "minmax(0, 1fr) auto auto",
    },
  },
  query: {
    gridColumnStart: 1,
    gridColumnEnd: {
      default: -1,
      [media.sm]: "auto",
    },
  },
  platform: {
    minWidth: "9.5rem",
  },
  empty: {
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
  const [platform, setPlatform] = useState<EaSearchPlatform>(EA_SEARCH_PLATFORM.NINTENDO);
  const validation = useFormValidation<ClubSearchField>();
  const searchClubs = useSearchClubsMutation();
  const retry = useRetryAfterCountdown();
  const loading = searchClubs.isPending;
  const form = applyStyles(styles.form);
  const query = applyStyles(styles.query);
  const platformTrigger = applyStyles(styles.platform);

  async function handleSubmit(formValues: ClubSearchValues) {
    if (loading || retry.blocked) {
      return;
    }

    setError(null);
    validation.clearServerErrors();

    try {
      const result = await searchClubs.mutateAsync({
        query: formValues.query.trim(),
        platform: formValues.platform || platform,
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
            ? t("gameData.clubSearch.rateLimited")
            : t("gameData.clubSearch.error"),
          requestId: cause.requestId,
          retryAfterSeconds: cause.retryAfterSeconds,
        });
      } else {
        setError({ message: t("gameData.clubSearch.error") });
      }
    }
  }

  return (
    <div {...applyStyles(styles.panel)}>
      <Form<ClubSearchValues>
        aria-busy={loading}
        className={form.className}
        errors={validation.formErrors}
        onFormSubmit={handleSubmit}
        style={form.style}
      >
        <Field
          {...validation.getFieldValidationProps("query")}
          className={query.className}
          disabled={loading}
          name="query"
          style={query.style}
          validate={(value) =>
            readFormString(value).trim().length === 0
              ? t("gameData.clubSearch.queryRequired")
              : null
          }
        >
          <FieldLabel>{t("gameData.clubSearch.queryLabel")}</FieldLabel>
          <Input
            autoComplete="off"
            disabled={loading}
            name="query"
            placeholder={t("gameData.clubSearch.queryPlaceholder")}
          />
          <FieldError />
        </Field>

        <Select
          disabled={loading}
          itemToStringLabel={(value: string | null) =>
            value === null ? "" : eaPlatformLabel(value)
          }
          items={eaSearchPlatforms.map((option) => ({ label: option.label, value: option.value }))}
          onValueChange={(value: string | null) => {
            const next = value === null ? null : asEaSearchPlatform(value);
            if (next) setPlatform(next);
          }}
          value={platform}
        >
          <SelectTrigger
            aria-label={t("gameData.clubSearch.platformLabel")}
            className={platformTrigger.className}
            style={platformTrigger.style}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {eaSearchPlatforms.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input name="platform" type="hidden" value={platform} />

        <Button disabled={loading || retry.blocked} type="submit">
          {loading
            ? t("gameData.clubSearch.searching")
            : retry.blocked
              ? t("gameData.clubSearch.retryIn", { seconds: retry.remainingSeconds })
              : t("gameData.clubSearch.submit")}
        </Button>
      </Form>

      {error ? (
        <SupportErrorAlert
          error={{
            ...error,
            retryAfterSeconds: retry.remainingSeconds || undefined,
          }}
        />
      ) : null}

      {!error && searched && clubs.length === 0 ? (
        <p {...applyStyles(typography.body, styles.empty)}>{t("gameData.clubSearch.empty")}</p>
      ) : null}

      {!error && clubs.length > 0 ? <ClubSearchResultList clubs={clubs} /> : null}

      {!searched && !error ? (
        <p {...applyStyles(typography.caption, styles.source)}>{t("gameData.clubSearch.source")}</p>
      ) : null}
    </div>
  );
}
