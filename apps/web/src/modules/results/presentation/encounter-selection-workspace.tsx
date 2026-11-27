import type { Dispatch } from "react";
import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import { Alert, AlertDescription, applyStyles, Caption, Card, SectionTitle } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { CandidatesSection } from "./encounter-candidates.tsx";
import type { CandidatesState } from "./encounter-page.tsx";
import type { EncounterPreview, OfficialSlot, SlotAssignments } from "./encounter-preview.ts";
import { styles } from "./encounter-page.styles.ts";
import type { Formats } from "./encounter-parts.tsx";
import { OfficialSlotRow, SeriesPreviewPanel } from "./encounter-slots.tsx";
import type { TeamDraft, TeamDraftEvent } from "./team-selection-draft.ts";
import { TeamSelectionSection, type TeamSelectionState } from "./team-selection-section.tsx";

export function EncounterSelectionWorkspace({
  approvedAssignments,
  assignments,
  candidateList,
  candidates,
  dispatch,
  displayedPreview,
  draft,
  formats,
  isApproved,
  onInteract,
  preview,
  t,
  teamSelection,
  view,
}: {
  readonly approvedAssignments: SlotAssignments | null;
  readonly assignments: SlotAssignments;
  readonly candidateList: readonly EncounterCandidateDto[];
  readonly candidates: CandidatesState;
  readonly dispatch: Dispatch<TeamDraftEvent>;
  readonly displayedPreview: EncounterPreview;
  readonly draft: TeamDraft;
  readonly formats: Formats;
  readonly isApproved: boolean;
  readonly onInteract: () => void;
  readonly preview: EncounterPreview;
  readonly t: Translator;
  readonly teamSelection?: TeamSelectionState;
  readonly view: EncounterViewDto;
}) {
  return (
    <>
      {isApproved ? (
        <Alert variant="success">
          <AlertDescription>{t("encounter.selection.lockedNotice")}</AlertDescription>
        </Alert>
      ) : null}
      <div {...applyStyles(styles.workspace)}>
        <div {...applyStyles(styles.column)}>
          {teamSelection ? (
            <TeamSelectionSection
              candidates={candidateList}
              dispatch={dispatch}
              draft={draft}
              encounter={view}
              onInteract={onInteract}
              preview={preview}
              state={teamSelection}
            />
          ) : null}
          <Card aria-labelledby="encounter-slots" className={styles.panelCard}>
            <div {...applyStyles(styles.sectionCopy)}>
              <SectionTitle id="encounter-slots">{t("encounter.slots.title")}</SectionTitle>
              <Caption>{t("encounter.slots.description")}</Caption>
            </div>
            <ol {...applyStyles(styles.list)}>
              {displayedPreview.slots.map((slot, index) => (
                <OfficialSlotRow
                  first={index === 0}
                  formats={formats}
                  key={slot.slot}
                  locked={isApproved}
                  onClear={() => {
                    onInteract();
                    dispatch({ type: "clear_slot", slot: slot.slot });
                  }}
                  preview={slot}
                  t={t}
                  view={view}
                />
              ))}
            </ol>
            {!isApproved ? <SeriesPreviewPanel series={preview.series} t={t} view={view} /> : null}
          </Card>
        </div>
        <div {...applyStyles(styles.column)}>
          <CandidatesSection
            approvedAssignments={approvedAssignments}
            assignments={assignments}
            formats={formats}
            onAssign={(slot: OfficialSlot, key: string) => {
              onInteract();
              dispatch({ type: "assign", slot, key });
            }}
            selectionLocked={isApproved}
            state={candidates}
            t={t}
            view={view}
          />
        </div>
      </div>
    </>
  );
}
