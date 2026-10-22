"use client";

import { Link } from "@tanstack/react-router";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import type { CompetitionDraftDto } from "@futrob/api-contracts";
import {
  Alert,
  AlertDescription,
  applyStyles,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
  Heading,
  MetaList,
  Separator,
  Skeleton,
} from "@futrob/ui";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { DEFAULT_MAX_ROSTER_SIZE } from "@futrob/teams";
import accessUrl from "@/assets/illustration-permissions.png";
import rulesUrl from "@/assets/illustration-rules.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";
import { useCan } from "@/shared/presentation/permissions/index.ts";
import { useCompetitionRulesQuery } from "./competition-queries.ts";
import {
  rulesAreEditable,
  rulesStages,
  showsResolution,
  type RulesStage,
} from "./competition-rules-model.ts";
import { PlatformRules, RetryAlert, Section, Fact } from "./competition-rules-parts.tsx";
import { styles } from "./competition-rules-page.styles.ts";

export type CompetitionRulesState =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not_found" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly draft: CompetitionDraftDto;
      readonly canEdit: boolean;
      /** Set when a refresh failed transiently and the shown rules may be stale. */
      readonly refreshFailed?: (() => void) | undefined;
    };

type Scope = { readonly organizationId: string; readonly competitionId: string };

export function CompetitionRulesRoute(scope: Scope) {
  const query = useCompetitionRulesQuery(scope.organizationId, scope.competitionId);
  const update = useCan(scope, COMPETITION_PERMISSION.update);
  const state: CompetitionRulesState = (() => {
    const retry = () => void query.refetch();
    const read = query.data;
    // A refusal is the last successful read, so it wins over any later transient error.
    if (read?.kind === "refused") return { kind: read.refusal };
    if (read) {
      return {
        kind: "ready",
        draft: read.draft,
        canEdit: rulesAreEditable(read.draft, update.allowed),
        refreshFailed: query.isError ? retry : undefined,
      };
    }
    if (query.isError) return { kind: "error", retry };
    return { kind: "loading" };
  })();
  return <CompetitionRulesPageView {...scope} state={state} />;
}

export function CompetitionRulesPageView({
  competitionId,
  organizationId,
  state,
}: Scope & { readonly state: CompetitionRulesState }) {
  const { t } = useI18n();
  const edit =
    state.kind === "ready" && state.canEdit ? (
      <Button
        render={
          <Link
            params={{ orgId: organizationId, competitionId }}
            search={{ step: "rules" }}
            to="/orgs/$orgId/competitions/$competitionId/setup"
          />
        }
        variant="secondary"
      >
        <PencilSimpleIcon aria-hidden size={18} />
        {t("competitionRules.edit")}
      </Button>
    ) : undefined;
  return (
    <PageScaffold actions={edit} page="competition.rules">
      <RulesBody state={state} t={t} />
    </PageScaffold>
  );
}

function RulesBody({
  state,
  t,
}: {
  readonly state: CompetitionRulesState;
  readonly t: Translator;
}) {
  switch (state.kind) {
    case "loading":
      return (
        <div
          aria-busy="true"
          aria-label={t("competitionRules.loading")}
          role="status"
          {...applyStyles(styles.stack)}
        >
          <Skeleton {...applyStyles(styles.skeleton)} />
          <Skeleton {...applyStyles(styles.skeleton)} />
        </div>
      );
    case "error":
      return <RetryAlert message={t("competitionRules.error")} onRetry={state.retry} t={t} />;
    case "forbidden":
      return (
        <Refusal
          description={t("competitionRules.forbidden.description")}
          image={accessUrl}
          title={t("competitionRules.forbidden.title")}
        />
      );
    case "not_found":
      return (
        <Refusal
          description={t("competitionRules.notFound.description")}
          image={rulesUrl}
          title={t("competitionRules.notFound.title")}
        />
      );
    case "ready":
      return <ReadyRules draft={state.draft} refreshFailed={state.refreshFailed} t={t} />;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

function Refusal({
  description,
  image,
  title,
}: {
  readonly description: string;
  readonly image: string;
  readonly title: string;
}) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <img alt="" data-outline="none" src={image} />
      </EmptyStateIcon>
      <EmptyStateCopy>
        <EmptyStateTitle>{title}</EmptyStateTitle>
        <EmptyStateDescription>{description}</EmptyStateDescription>
      </EmptyStateCopy>
    </EmptyState>
  );
}

function ReadyRules({
  draft,
  refreshFailed,
  t,
}: {
  readonly draft: CompetitionDraftDto;
  readonly refreshFailed?: (() => void) | undefined;
  readonly t: Translator;
}) {
  const { competition, rules } = draft;
  const stages = rulesStages(draft);
  const isDraft = competition.status === "draft";
  const teams = competition.teams;
  return (
    <div {...applyStyles(styles.page)}>
      <div {...applyStyles(styles.statusRow)}>
        <Badge variant={isDraft ? "neutral" : "info"}>
          {t(`competitionRules.status.${competition.status}`)}
        </Badge>
      </div>
      {refreshFailed ? (
        <RetryAlert message={t("competitionRules.refreshError")} onRetry={refreshFailed} t={t} />
      ) : null}
      <Alert>
        <AlertDescription>
          {t(isDraft ? "competitionRules.notice.draft" : "competitionRules.notice.locked")}
        </AlertDescription>
      </Alert>
      <div {...applyStyles(styles.columns)}>
        <Card>
          <CardContent className={styles.cardBody}>
            <Section title={t("competitionRules.format.title")}>
              <MetaList columns={2}>
                <Fact label={t("competitionRules.format.label")}>
                  {t(`competitionRules.format.${competition.format}`)}
                </Fact>
                <Fact label={t("competitionRules.format.teams")}>
                  {teams.max === null
                    ? t("competitionRules.format.teamsAtLeast", { min: teams.min })
                    : t("competitionRules.format.teamsRange", { min: teams.min, max: teams.max })}
                </Fact>
              </MetaList>
            </Section>
            {stages.map((stage) => (
              <StageRules key={stage.key} stage={stage} t={t} />
            ))}
            <Separator />
            <Section title={t("competitionRules.roster.title")}>
              <MetaList columns={2}>
                <Fact label={t("competitionRules.roster.max")}>
                  {rules.maxRosterSize === null
                    ? t("competitionRules.roster.default", { count: DEFAULT_MAX_ROSTER_SIZE })
                    : t("competitionRules.value.players", { count: rules.maxRosterSize })}
                </Fact>
              </MetaList>
            </Section>
          </CardContent>
        </Card>
        <PlatformRules t={t} />
      </div>
    </div>
  );
}

function StageRules({ stage, t }: { readonly stage: RulesStage; readonly t: Translator }) {
  const { rules } = stage;
  return (
    <>
      <Separator />
      <Section
        description={t("competitionRules.stage.description")}
        title={t(`competitionRules.stage.${stage.label}`)}
      >
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.scoring.title")}
        </Heading>
        <MetaList columns={2}>
          <Fact label={t("competitionRules.scoring.win")}>{rules.winPoints}</Fact>
          <Fact label={t("competitionRules.scoring.draw")}>{rules.drawPoints}</Fact>
          <Fact label={t("competitionRules.scoring.loss")}>{rules.lossPoints}</Fact>
        </MetaList>
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.encounter.title")}
        </Heading>
        <MetaList columns={2}>
          <Fact label={t("competitionRules.encounter.matches")}>
            {t("competitionRules.value.matches", { count: rules.officialMatchesPerEncounter })}
          </Fact>
          {showsResolution(rules) ? (
            <Fact label={t("competitionRules.encounter.resolution")}>
              {t(
                rules.resolutionMode === "aggregate_score"
                  ? "competitionRules.encounter.aggregate"
                  : "competitionRules.encounter.independent",
              )}
            </Fact>
          ) : null}
        </MetaList>
        <Heading as="h3" {...applyStyles(styles.heading)}>
          {t("competitionRules.reschedule.title")}
        </Heading>
        {rules.allowRescheduling ? (
          <MetaList columns={2}>
            <Fact label={t("competitionRules.reschedule.max")}>
              {rules.maxReschedulesPerTeam === null
                ? t("competitionRules.reschedule.unlimited")
                : rules.maxReschedulesPerTeam}
            </Fact>
            <Fact label={t("competitionRules.reschedule.notice")}>
              {t("competitionRules.value.hours", { count: rules.minimumRescheduleNoticeHours })}
            </Fact>
            <Fact label={t("competitionRules.reschedule.expiry")}>
              {t("competitionRules.value.hours", { count: rules.rescheduleProposalExpiryHours })}
            </Fact>
            <Fact label={t("competitionRules.reschedule.opponent")}>
              {approval(rules.rescheduleRequiresOpponentApproval, t)}
            </Fact>
            <Fact label={t("competitionRules.reschedule.organizer")}>
              {approval(rules.rescheduleRequiresOrganizerApproval, t)}
            </Fact>
          </MetaList>
        ) : (
          <MetaList columns={1}>
            <Fact label={t("competitionRules.reschedule.allowed")}>
              {t("competitionRules.reschedule.allowedNo")}
            </Fact>
          </MetaList>
        )}
      </Section>
    </>
  );
}

function approval(required: boolean, t: Translator): string {
  return t(
    required ? "competitionRules.reschedule.required" : "competitionRules.reschedule.notRequired",
  );
}
