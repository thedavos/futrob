"use client";

import { useId, useRef, useState } from "react";
import { maxSwissRounds, defaultSwissRounds } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Button,
  Card,
  CardContent,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Heading,
  Input,
  Subtitle,
  typography,
} from "@futrob/ui";
import { PlanUpsellAlert } from "@/modules/billing/presentation/plan-upsell-alert.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./competition-fixture-page.styles.ts";
import {
  swissCommandRecovery,
  swissRecoveryText,
  type SwissCommandRecovery,
  type SwissFixtureCommands,
} from "./swiss-fixture-commands.ts";
import {
  swissGenerateDefaults,
  validateSwissGenerate,
  type SwissGenerateContext,
  type SwissGenerateField,
  type SwissGenerateValues,
} from "./swiss-fixture-generate-model.ts";

/** The first calendar of a published Swiss competition. Other formats keep the empty state. */
export function SwissFixtureGenerateForm({
  commands,
  context,
  onNotice,
  organizationId,
}: {
  readonly commands: SwissFixtureCommands;
  readonly context: SwissGenerateContext;
  readonly onNotice: (notice: FixtureNotice) => void;
  readonly organizationId: string;
}) {
  const { t } = useI18n();
  const id = useId();
  const [values, setValues] = useState(() => swissGenerateDefaults(context.teamCount));
  const [invalid, setInvalid] = useState<readonly SwissGenerateField[]>([]);
  const [failure, setFailure] = useState<SwissCommandRecovery | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const maxRounds = maxSwissRounds(context.teamCount);

  const field = (name: SwissGenerateField, value: string) => {
    setValues((current: SwissGenerateValues) => ({ ...current, [name]: value }));
    setInvalid((current) => current.filter((entry) => entry !== name));
  };

  async function submit() {
    if (inFlight.current) return;
    setFailure(null);
    const validation = validateSwissGenerate(values, context, new Date());
    if (!validation.ok) {
      setInvalid(validation.invalid);
      return;
    }
    setInvalid([]);
    inFlight.current = true;
    setPending(true);
    try {
      await commands.generate(validation.request);
      onNotice({ tone: "success", text: t("fixture.generate.done") });
    } catch (cause) {
      const recovery = swissCommandRecovery(
        cause instanceof FutrobApiError ? cause : null,
        "generate",
      );
      if (recovery.draft === "close") {
        onNotice({ tone: "warning", text: swissRecoveryText(recovery, t) });
      } else {
        setFailure(recovery);
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const roundsInvalid = invalid.includes("rounds") || failure?.field === "rounds";
  return (
    <Card>
      <CardContent className={styles.generateCard}>
        <div {...applyStyles(styles.generateCopy)}>
          <Heading as="h2" {...applyStyles(typography.title)}>
            {t("fixture.generate.title")}
          </Heading>
          <Subtitle>{t("fixture.generate.description", { count: context.teamCount })}</Subtitle>
        </div>
        <form
          aria-busy={pending}
          aria-label={t("fixture.generate.title")}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          {...applyStyles(styles.generateForm)}
        >
          {failure && "upsell" in failure.message ? (
            <PlanUpsellAlert code={failure.message.upsell} organizationId={organizationId} />
          ) : failure ? (
            <Alert variant="destructive">
              <AlertDescription>{swissRecoveryText(failure, t)}</AlertDescription>
            </Alert>
          ) : null}
          <div {...applyStyles(styles.generateFields)}>
            <Field disabled={pending} invalid={invalid.includes("startsAt")}>
              <FieldLabel htmlFor={`${id}-start`}>{t("fixture.generate.start")}</FieldLabel>
              <Input
                aria-describedby={`${id}-start-zone`}
                aria-invalid={invalid.includes("startsAt")}
                id={`${id}-start`}
                onChange={(event) => field("startsAt", event.target.value)}
                required
                type="datetime-local"
                value={values.startsAt}
              />
              <FieldDescription id={`${id}-start-zone`}>
                {t("fixture.timeZone", { zone: context.timeZone })}
              </FieldDescription>
              {invalid.includes("startsAt") ? (
                <FieldError match>{t("fixture.generate.startInvalid")}</FieldError>
              ) : null}
            </Field>
            <Field disabled={pending} invalid={invalid.includes("intervalDays")}>
              <FieldLabel htmlFor={`${id}-interval`}>{t("fixture.generate.interval")}</FieldLabel>
              <Input
                aria-invalid={invalid.includes("intervalDays")}
                id={`${id}-interval`}
                inputMode="numeric"
                min={1}
                onChange={(event) => field("intervalDays", event.target.value)}
                required
                type="number"
                value={values.intervalDays}
              />
              {invalid.includes("intervalDays") ? (
                <FieldError match>{t("fixture.generate.intervalInvalid")}</FieldError>
              ) : null}
            </Field>
            <Field disabled={pending} invalid={roundsInvalid}>
              <FieldLabel htmlFor={`${id}-rounds`}>{t("fixture.generate.rounds")}</FieldLabel>
              <Input
                aria-describedby={`${id}-rounds-hint`}
                aria-invalid={roundsInvalid}
                id={`${id}-rounds`}
                inputMode="numeric"
                max={maxRounds}
                min={1}
                onChange={(event) => field("rounds", event.target.value)}
                required
                type="number"
                value={values.rounds}
              />
              <FieldDescription id={`${id}-rounds-hint`}>
                {t("fixture.generate.roundsHint", {
                  recommended: defaultSwissRounds(context.teamCount),
                  max: maxRounds,
                })}
              </FieldDescription>
              {invalid.includes("rounds") ? (
                <FieldError match>
                  {t("fixture.generate.roundsInvalid", { max: maxRounds })}
                </FieldError>
              ) : null}
            </Field>
          </div>
          <div>
            <Button disabled={pending} type="submit">
              {t("fixture.generate.submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type FixtureNotice = {
  readonly tone: "success" | "warning";
  readonly text: string;
};
