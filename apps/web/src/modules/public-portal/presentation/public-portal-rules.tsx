import { useId } from "react";
import type { GetPublicRulesResponse, PublicStageRulesDto } from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Card,
  CardContent,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  Separator,
  typography,
} from "@futrob/ui";
import rulesUrl from "@/assets/illustration-rules.png";
import { competitionFormatLabel } from "@/modules/competitions/presentation/competition-labels.ts";
import { PlatformRules } from "@/modules/competitions/presentation/competition-rules-parts.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PortalEmpty } from "./public-portal-states.tsx";
import { rulesStyles } from "./public-portal-rules.styles.ts";

type Rules = GetPublicRulesResponse["rules"];

function StageRules({ stage }: { readonly stage: PublicStageRulesDto }) {
  const { t } = useI18n();
  const headingId = useId();
  const { rescheduling } = stage;
  return (
    <>
      <Separator />
      <section aria-labelledby={headingId} {...applyStyles(rulesStyles.section)}>
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
    </>
  );
}

/**
 * Public competition rules (Alternative A): two-column flat Card layout pairing competition
 * stage configuration with the fixed platform rules (tiebreaks and officialization).
 */
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
    <div {...applyStyles(rulesStyles.columns)}>
      <Card>
        <CardContent className={rulesStyles.cardBody}>
          <section aria-labelledby={headingId} {...applyStyles(rulesStyles.section)}>
            <div {...applyStyles(rulesStyles.sectionHead)}>
              <Heading as="h2" className={typography.title} id={headingId}>
                {t("portal.rules.competitionTitle")}
              </Heading>
              <Badge variant="neutral">{competitionFormatLabel(rules.format, t)}</Badge>
            </div>
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
                      : t("portal.rules.teams.range", {
                          min: rules.teams.min,
                          max: rules.teams.max,
                        })}
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
        </CardContent>
      </Card>

      <PlatformRules format={rules.format} t={t} />
    </div>
  );
}
