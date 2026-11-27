import type {
  EncounterCandidateDto,
  EncounterViewDto,
  OfficialSelectionProposalDto,
  OfficialSelectionViewDto,
} from "@futrob/api-contracts";
import {
  applyStyles,
  Badge,
  Button,
  Caption,
  Card,
  Heading,
  SectionTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@futrob/ui";
import { ArrowRightIcon, LockIcon, SealCheckIcon } from "@phosphor-icons/react";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { EncounterScorePill } from "./encounter-score.tsx";
import type { EncounterPreview } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import type { Formats } from "./encounter-parts.tsx";
import { proposalLabel } from "./selection-record.tsx";

export type OverviewTargetTab = "selection" | "schedule" | "review";

export function EncounterOverviewTab({
  approvedPreview,
  approvedProposal,
  candidatesCount,
  formats,
  hasReviewTab,
  onNavigateTab,
  requestsCount,
  selectionView,
  t,
  view,
}: {
  readonly approvedPreview: EncounterPreview | null;
  readonly approvedProposal: OfficialSelectionProposalDto | null;
  readonly candidatesCount: number;
  readonly formats: Formats;
  readonly hasReviewTab: boolean;
  readonly onNavigateTab: (tab: OverviewTargetTab) => void;
  readonly requestsCount: number;
  readonly selectionView: OfficialSelectionViewDto | null;
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const actionsCount = selectionView?.actions.length ?? 0;

  if (approvedPreview) {
    const resolved = selectionView?.disputes
      .filter((dispute) => dispute.status === "resolved")
      .at(-1);
    const byOperator =
      approvedProposal !== null &&
      resolved?.resolution === "approved_proposal" &&
      resolved.resolutionProposalId === approvedProposal.id;
    const basis = t(
      byOperator
        ? "encounter.selection.outcome.byOperator"
        : "encounter.selection.outcome.byAgreement",
    );

    return (
      <>
        <Card
          aria-labelledby="encounter-overview-official"
          className={[styles.panelCard, styles.panelCardApproved]}
        >
          <div {...applyStyles(styles.panelCardHeader)}>
            <div {...applyStyles(styles.panelCardCopy)}>
              <Heading as="h2" id="encounter-overview-official">
                {t("encounter.selection.approved")}
              </Heading>
              {approvedProposal && selectionView ? (
                <Caption>
                  {t("encounter.overview.officialSubtitle", {
                    proposal: proposalLabel(approvedProposal, t),
                    basis,
                  })}
                </Caption>
              ) : null}
            </div>
            <Badge variant="approved">
              <SealCheckIcon aria-hidden="true" />
              {t("encounter.selection.status.approved")}
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("encounter.overview.table.match")}</TableHead>
                <TableHead>{t("encounter.overview.table.eaMatch")}</TableHead>
                <TableHead align="end">{t("encounter.overview.table.score")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedPreview.slots.map((slot) => (
                <ApprovedSlotTableRow
                  formats={formats}
                  key={slot.slot}
                  proposal={approvedProposal}
                  slot={slot}
                  t={t}
                  view={view}
                />
              ))}
              {approvedPreview.series.kind === "aggregate" ? (
                <TableRow>
                  <TableCell>
                    <Text tone="default" weight="semibold">
                      {t("encounter.overview.table.aggregate")}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Caption>
                      {approvedPreview.series.outcome === "draw"
                        ? t("encounter.outcome.draw")
                        : t("encounter.outcome.win", {
                            team: view[approvedPreview.series.outcome].name,
                          })}
                    </Caption>
                  </TableCell>
                  <TableCell align="end">
                    <EncounterScorePill
                      label={t("encounters.list.score.singleAria", {
                        home: approvedPreview.series.total.home,
                        away: approvedPreview.series.total.away,
                      })}
                      score={[
                        {
                          homeGoals: approvedPreview.series.total.home,
                          awayGoals: approvedPreview.series.total.away,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <div {...applyStyles(styles.panelCardFooter)}>
            <Caption className={styles.status}>
              <LockIcon aria-hidden="true" />
              {t("encounter.overview.scheduleLocked")}
            </Caption>
            {hasReviewTab ? <Caption>{t("encounter.review.noCommands")}</Caption> : null}
          </div>
        </Card>

        <Card aria-labelledby="encounter-overview-quick" className={styles.panelCard}>
          <div {...applyStyles(styles.panelCardHeader)}>
            <div {...applyStyles(styles.panelCardCopy)}>
              <SectionTitle id="encounter-overview-quick">
                {t("encounter.overview.quickTitle")}
              </SectionTitle>
              <Caption>
                {t("encounter.overview.quickSummary", {
                  candidates: candidatesCount,
                  requests: requestsCount,
                  actions: actionsCount,
                })}
              </Caption>
            </div>
            <div {...applyStyles(styles.actions)}>
              <Button onClick={() => onNavigateTab("selection")} variant="secondary">
                {t("encounter.overview.openSelection")}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
              {hasReviewTab ? (
                <Button onClick={() => onNavigateTab("review")} variant="outline">
                  {t("encounter.overview.openReview")}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      </>
    );
  }

  const primaryTarget: OverviewTargetTab =
    hasReviewTab &&
    (selectionView?.selection?.status === "disputed" ||
      selectionView?.selection?.status === "organizer_review")
      ? "review"
      : "selection";

  return (
    <Card aria-labelledby="encounter-overview-pending" className={styles.panelCard}>
      <div {...applyStyles(styles.panelCardHeader)}>
        <div {...applyStyles(styles.panelCardCopy)}>
          <Heading as="h2" id="encounter-overview-pending">
            {t("encounter.overview.pendingTitle")}
          </Heading>
          <Caption>{t("encounter.overview.pendingDescription")}</Caption>
        </div>
        <Button onClick={() => onNavigateTab(primaryTarget)} variant="default">
          {primaryTarget === "review"
            ? t("encounter.overview.openReview")
            : t("encounter.overview.openSelection")}
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("encounter.overview.table.match")}</TableHead>
            <TableHead align="end">{t("encounter.overview.table.score")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.officialMatches.map((match) => (
            <TableRow key={match.officialSlot}>
              <TableCell>
                <div {...applyStyles(styles.cellStack)}>
                  <Text tone="default" weight="semibold">
                    {t("encounter.slot.label", { slot: match.officialSlot })}
                  </Text>
                  <Caption>
                    <time dateTime={match.scheduledStartAt}>
                      {formats.kickoff.format(new Date(match.scheduledStartAt))}
                    </time>
                  </Caption>
                </div>
              </TableCell>
              <TableCell align="end">
                <Caption>—</Caption>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ApprovedSlotTableRow({
  formats,
  proposal,
  slot,
  t,
  view,
}: {
  readonly formats: Formats;
  readonly proposal: OfficialSelectionProposalDto | null;
  readonly slot: EncounterPreview["slots"][number];
  readonly t: Translator;
  readonly view: EncounterViewDto;
}) {
  const scheduledAt = view.officialMatches.find(
    (match) => match.officialSlot === slot.slot,
  )?.scheduledStartAt;
  const bound = proposal?.slots.find((item) => item.officialSlot === slot.slot) ?? null;

  return (
    <TableRow>
      <TableCell>
        <div {...applyStyles(styles.cellStack)}>
          <Text tone="default" weight="semibold">
            {t("encounter.slot.label", { slot: slot.slot })}
          </Text>
          {scheduledAt ? (
            <Caption>
              <time dateTime={scheduledAt}>{formats.kickoff.format(new Date(scheduledAt))}</time>
            </Caption>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <SlotEaBacking
          boundId={bound?.providerMatchRef.externalId ?? null}
          formats={formats}
          slot={slot}
          t={t}
        />
      </TableCell>
      <TableCell align="end">
        {slot.kind === "scored" ? (
          <EncounterScorePill
            label={t("encounters.list.score.singleAria", {
              home: slot.score.home,
              away: slot.score.away,
            })}
            score={[{ homeGoals: slot.score.home, awayGoals: slot.score.away }]}
          />
        ) : (
          <Caption>—</Caption>
        )}
      </TableCell>
    </TableRow>
  );
}

function SlotEaBacking({
  boundId,
  formats,
  slot,
  t,
}: {
  readonly boundId: string | null;
  readonly formats: Formats;
  readonly slot: EncounterPreview["slots"][number];
  readonly t: Translator;
}) {
  const candidate: EncounterCandidateDto | null =
    slot.kind === "scored" ? slot.candidate : slot.kind === "unmatched" ? slot.candidate : null;
  if (candidate) {
    return (
      <div {...applyStyles(styles.cellStack)}>
        <Text tone="default" weight="medium">
          {t("encounter.selection.slot.match", { match: candidate.reference.externalId })}
        </Text>
        <Caption>
          {formats.kickoff.format(new Date(candidate.occurredAt))} ·{" "}
          {t("encounter.candidate.players", { count: candidate.playerObservationCount })}
        </Caption>
      </div>
    );
  }
  return (
    <Caption>{boundId ? t("encounter.selection.slot.match", { match: boundId }) : "—"}</Caption>
  );
}
