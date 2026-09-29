"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import type { CompetitionApplicationDto, CompetitionStatusDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  applyStyles,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
} from "@futrob/ui";
import { CompetitionsClientError } from "@/modules/competitions/presentation/competitions-browser-client.ts";
import {
  useApplyToCompetitionMutation,
  useMyCompetitionApplicationQuery,
} from "@/modules/competitions/presentation/competition-queries.ts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles } from "./explore-competitions-page.styles.ts";

/** Viewer's own entry, or the self-service application form while registration is open. */
export function ExploreCompetitionApplication({
  competitionId,
  status,
}: {
  readonly competitionId: string;
  readonly status: CompetitionStatusDto;
}) {
  const query = useMyCompetitionApplicationQuery(competitionId);
  const application = query.data?.application ?? null;
  if (application) {
    return (
      <section {...applyStyles(styles.applySection)}>
        <ApplicationStatus application={application} competitionId={competitionId} />
      </section>
    );
  }
  if (status !== "registration" || !query.isSuccess) return null;
  return (
    <section {...applyStyles(styles.applySection)}>
      <ApplicationForm competitionId={competitionId} />
    </section>
  );
}

function ApplicationForm({ competitionId }: { readonly competitionId: string }) {
  const { t } = useI18n();
  const apply = useApplyToCompetitionMutation(competitionId);
  const [teamName, setTeamName] = useState("");
  const [creationKey] = useState(() => crypto.randomUUID());
  const trimmed = teamName.trim();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed || apply.isPending) return;
    apply.mutate({ teamName: trimmed, creationKey });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("player.competitions.apply.title")}</CardTitle>
        <CardDescription>{t("player.competitions.apply.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} {...applyStyles(styles.applyForm)}>
          <Field {...applyStyles(styles.applyField)}>
            <FieldLabel htmlFor="competition-apply-team-name">
              {t("player.competitions.apply.teamName")}
            </FieldLabel>
            <Input
              autoComplete="off"
              id="competition-apply-team-name"
              maxLength={120}
              onChange={(event) => setTeamName(event.target.value)}
              required
              value={teamName}
            />
          </Field>
          <Button disabled={!trimmed || apply.isPending} type="submit">
            {apply.isPending
              ? t("player.competitions.apply.submitting")
              : t("player.competitions.apply.submit")}
          </Button>
        </form>
        {apply.isError ? (
          <p role="alert" {...applyStyles(styles.applyError)}>
            {t(applyErrorKey(apply.error))}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ApplicationStatus({
  application,
  competitionId,
}: {
  readonly application: CompetitionApplicationDto;
  readonly competitionId: string;
}) {
  const { t } = useI18n();
  const team = application.teamName;
  switch (application.status) {
    case "pending":
      return (
        <Alert role="status" variant="info">
          <AlertTitle>{t("player.competitions.apply.status.pending.title")}</AlertTitle>
          <AlertDescription>
            {t("player.competitions.apply.status.pending.description", { team })}
          </AlertDescription>
        </Alert>
      );
    case "approved":
      return (
        <Alert role="status" variant="success">
          <AlertTitle>{t("player.competitions.apply.status.approved.title")}</AlertTitle>
          <AlertDescription {...applyStyles(styles.error)}>
            <span>{t("player.competitions.apply.status.approved.description", { team })}</span>
            <Button
              render={<Link params={{ competitionId }} to="/player/competitions/$competitionId" />}
              variant="outline"
            >
              {t("player.competitions.apply.status.approved.cta")}
            </Button>
          </AlertDescription>
        </Alert>
      );
    case "rejected":
      return (
        <Alert role="status" variant="warning">
          <AlertTitle>{t("player.competitions.apply.status.rejected.title")}</AlertTitle>
          <AlertDescription>
            {t("player.competitions.apply.status.rejected.description", { team })}
          </AlertDescription>
        </Alert>
      );
    default: {
      const _exhaustive: never = application.status;
      return _exhaustive;
    }
  }
}

function applyErrorKey(error: Error): ParameterlessMessageKey {
  if (error instanceof CompetitionsClientError) {
    if (error.code === "competitions.registration_closed") {
      return "player.competitions.apply.error.closed";
    }
    if (error.code === "teams.roster_competition_conflict") {
      return "player.competitions.apply.error.conflict";
    }
  }
  return "player.competitions.apply.error";
}
