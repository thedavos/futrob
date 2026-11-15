import { useId } from "react";
import type {
  CompetitionFormatDto,
  GetPublicBracketResponse,
  GetPublicRulesResponse,
  GetPublicTeamsResponse,
  PublicBracketEncounterDto,
  PublicStageRulesDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Caption,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Score,
  Text,
} from "@futrob/ui";
import pendingBracketUrl from "@/assets/illustration-pending-bracket.png";
import rulesUrl from "@/assets/illustration-rules.png";
import squadUrl from "@/assets/illustration-squad.png";
import { competitionFormatLabel } from "@/modules/competitions/presentation/competition-labels.ts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { bracketSideLabel, hasBracket, kickoffLabel } from "./public-portal-model.ts";
import { PortalEmpty } from "./public-portal-states.tsx";
import { styles } from "./public-portal.styles.ts";

type Bracket = NonNullable<GetPublicBracketResponse["bracket"]>;
type Rules = GetPublicRulesResponse["rules"];

export function PortalTeamsView({ teams }: { readonly teams: GetPublicTeamsResponse["teams"] }) {
  const { t } = useI18n();
  const headingId = useId();
  if (teams.length === 0) {
    return (
      <PortalEmpty
        description={t("portal.teams.empty.description")}
        illustration={squadUrl}
        title={t("portal.teams.empty.title")}
      />
    );
  }
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <Heading as="h2" id={headingId}>
        {t("portal.header.teams", { count: teams.length })}
      </Heading>
      <ul {...applyStyles(styles.teams)}>
        {teams.map((team) => (
          <li key={team.name} {...applyStyles(styles.teamCard)}>
            <Text weight="semibold">{team.name}</Text>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Rounds left to right on wide screens and stacked on narrow ones. Each round is a plain list,
 * so the visual bracket and the accessible list are the same markup (UX-BRK-001).
 */
export function PortalBracketView({
  bracket,
  format,
}: {
  readonly bracket: Bracket | null;
  readonly format: CompetitionFormatDto;
}) {
  const { t } = useI18n();
  // The tab is omitted for these formats; a typed or shared URL still gets a clear answer.
  if (!hasBracket(format)) {
    return (
      <PortalEmpty
        description={t("bracket.noBracket.description")}
        illustration={pendingBracketUrl}
        title={t("bracket.noBracket.title")}
      />
    );
  }
  if (!bracket || bracket.stages.length === 0) {
    return (
      <PortalEmpty
        description={t("bracket.empty.description")}
        illustration={pendingBracketUrl}
        title={t("bracket.empty.title")}
      />
    );
  }
  return (
    <div {...applyStyles(styles.rounds)}>
      {bracket.stages.map((stage) => (
        <BracketStage key={stage.kind} stage={stage} timeZone={bracket.timeZone} />
      ))}
    </div>
  );
}

function BracketStage({
  stage,
  timeZone,
}: {
  readonly stage: Bracket["stages"][number];
  readonly timeZone: string;
}) {
  const { t } = useI18n();
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <Heading as="h2" id={headingId}>
        {t(`portal.bracket.stage.${stage.kind}`)}
      </Heading>
      <ol {...applyStyles(styles.bracket)}>
        {stage.rounds.map((round) => (
          <li key={round.number} {...applyStyles(styles.section)}>
            <Heading as="h3">{t("portal.bracket.round", { round: round.number })}</Heading>
            <ul {...applyStyles(styles.list)}>
              {round.encounters.map((encounter) => (
                <BracketEncounter encounter={encounter} key={encounter.order} timeZone={timeZone} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

function BracketEncounter({
  encounter,
  timeZone,
}: {
  readonly encounter: PublicBracketEncounterDto;
  readonly timeZone: string;
}) {
  const { locale, t } = useI18n();
  const isBye = encounter.home.kind === "bye" || encounter.away.kind === "bye";
  // A bye never shows a score, not even a 0–0 (UX-BRK-002).
  const legs = isBye ? null : encounter.score;
  return (
    <li {...applyStyles(styles.listItem, styles.bracketEncounter)}>
      <Caption as="p">
        {t("portal.bracket.encounter", { order: encounter.order })} ·{" "}
        <time dateTime={encounter.scheduledStartAt}>
          {kickoffLabel(encounter.scheduledStartAt, timeZone, locale)}
        </time>
        {encounter.officialMatchCount === 2 ? ` · ${t("bracket.twoLegs")}` : null}
      </Caption>
      <BracketSideRow goals={legs ? legs.map((leg) => leg.homeGoals).join(" · ") : null}>
        {bracketSideLabel(encounter.home, t)}
      </BracketSideRow>
      <BracketSideRow goals={legs ? legs.map((leg) => leg.awayGoals).join(" · ") : null}>
        {bracketSideLabel(encounter.away, t)}
      </BracketSideRow>
      {encounter.status === "official" ? (
        <span>
          <Badge variant="approved">{t("portal.encounter.status.official")}</Badge>
        </span>
      ) : null}
    </li>
  );
}

function BracketSideRow({
  children,
  goals,
}: {
  readonly children: string;
  /** One figure per official match, so two legs read «2 · 1» and are never summed. */
  readonly goals: string | null;
}) {
  return (
    <p {...applyStyles(styles.bracketSide)}>
      <Text>{children}</Text>
      {goals === null ? null : (
        <Score as="span" size="table">
          {goals}
        </Score>
      )}
    </p>
  );
}

export function PortalRulesView({ rules }: { readonly rules: Rules }) {
  const { t } = useI18n();
  const headingId = useId();
  if (!rules.teams && rules.stages.length === 0) {
    return (
      <PortalEmpty
        description={t("portal.rules.empty.description")}
        illustration={rulesUrl}
        title={t("portal.rules.empty.title")}
      />
    );
  }
  return (
    <div {...applyStyles(styles.rounds)}>
      <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
        <Heading as="h2" id={headingId}>
          {t("portal.section.rules")}
        </Heading>
        <MetaList columns={2}>
          <MetaItem>
            <MetaTerm>{t("portal.rules.format")}</MetaTerm>
            <MetaValue>{competitionFormatLabel(rules.format, t)}</MetaValue>
          </MetaItem>
          {rules.teams ? (
            <MetaItem>
              <MetaTerm>{t("portal.rules.teams")}</MetaTerm>
              <MetaValue>
                {rules.teams.max === null
                  ? t("portal.rules.teams.min", { min: rules.teams.min })
                  : t("portal.rules.teams.range", { min: rules.teams.min, max: rules.teams.max })}
              </MetaValue>
            </MetaItem>
          ) : null}
          <MetaItem>
            <MetaTerm>{t("portal.rules.roster")}</MetaTerm>
            <MetaValue>
              {rules.maxRosterSize === null
                ? t("portal.rules.roster.default")
                : t("portal.rules.roster.value", { count: rules.maxRosterSize })}
            </MetaValue>
          </MetaItem>
        </MetaList>
      </section>
      {rules.stages.map((stage) => (
        <StageRules key={stage.stage} stage={stage} />
      ))}
    </div>
  );
}

function StageRules({ stage }: { readonly stage: PublicStageRulesDto }) {
  const { t } = useI18n();
  const headingId = useId();
  const { rescheduling } = stage;
  return (
    <section aria-labelledby={headingId} {...applyStyles(styles.section)}>
      <Heading as="h3" id={headingId}>
        {t(`portal.rules.stage.${stage.stage}`)}
      </Heading>
      <MetaList columns={2}>
        <MetaItem>
          <MetaTerm>{t("portal.rules.points")}</MetaTerm>
          <MetaValue>{`${stage.winPoints} · ${stage.drawPoints} · ${stage.lossPoints}`}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaTerm>{t("portal.rules.matches")}</MetaTerm>
          <MetaValue>{stage.officialMatchesPerEncounter}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaTerm>{t("portal.rules.resolution")}</MetaTerm>
          <MetaValue>{t(`portal.rules.resolution.${stage.resolutionMode}`)}</MetaValue>
        </MetaItem>
        <MetaItem>
          <MetaTerm>{t("portal.rules.rescheduling")}</MetaTerm>
          <MetaValue>
            {!rescheduling.allowed
              ? t("portal.rules.rescheduling.none")
              : rescheduling.maxPerTeam === null
                ? t("portal.rules.rescheduling.unlimited", {
                    hours: rescheduling.minimumNoticeHours,
                  })
                : t("portal.rules.rescheduling.limited", {
                    count: rescheduling.maxPerTeam,
                    hours: rescheduling.minimumNoticeHours,
                  })}
          </MetaValue>
        </MetaItem>
      </MetaList>
    </section>
  );
}
