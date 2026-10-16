import type { EncounterCandidateDto, EncounterViewDto } from "@futrob/api-contracts";
import { applyStyles, Caption, Text } from "@futrob/ui";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import {
  assignmentsOf,
  previewEncounter,
  type OfficialSlot,
  type SlotPreview,
  type SlotSelection,
} from "./encounter-preview.ts";
import { styles } from "./selection.styles.ts";

type ProposalSlotsProps = {
  readonly candidates: readonly EncounterCandidateDto[];
  readonly encounter: EncounterViewDto;
  readonly slots: readonly SlotSelection[];
  readonly t: Translator;
};

/**
 * One official slot as the record shows it: what it counts and which EA match backs it.
 * Matches between the same clubs can share a score, so `match` is what tells them apart.
 */
export type SlotLine = {
  readonly slot: OfficialSlot;
  readonly summary: string;
  readonly match: string | null;
};

/** Each slot resolved to its candidate's score; the provider reference when it is gone. */
export function proposalSlotLines({
  candidates,
  encounter,
  slots,
  t,
}: ProposalSlotsProps): SlotLine[] {
  return previewEncounter(encounter, candidates, assignmentsOf(slots)).slots.map((preview) =>
    slotLine(preview, slots, encounter, t),
  );
}

export function ProposalSlots(props: ProposalSlotsProps) {
  return <SlotLineList lines={proposalSlotLines(props)} />;
}

/** One line per official slot of a local draft. */
export function SlotLines({
  encounter,
  previews,
  t,
}: {
  readonly encounter: EncounterViewDto;
  readonly previews: readonly SlotPreview[];
  readonly t: Translator;
}) {
  return <SlotLineList lines={previews.map((preview) => slotLine(preview, [], encounter, t))} />;
}

function SlotLineList({ lines }: { readonly lines: readonly SlotLine[] }) {
  return (
    <ul {...applyStyles(styles.slots)}>
      {lines.map((line) => (
        <li key={line.slot} {...applyStyles(styles.slot)}>
          <Text tone="default">{line.summary}</Text>
          {line.match ? <Caption as="span">{line.match}</Caption> : null}
        </li>
      ))}
    </ul>
  );
}

function slotLine(
  preview: SlotPreview,
  sent: readonly SlotSelection[],
  encounter: EncounterViewDto,
  t: Translator,
): SlotLine {
  const slot = preview.slot;
  switch (preview.kind) {
    case "scored":
      return {
        slot,
        summary: t("encounter.selection.slot.score", {
          slot,
          home: encounter.home.name,
          homeGoals: preview.score.home,
          awayGoals: preview.score.away,
          away: encounter.away.name,
        }),
        match: playedMatch(preview.candidate, encounter, t),
      };
    case "unmatched":
      return {
        slot,
        summary: t("encounter.selection.slot.unmatched", { slot }),
        match: playedMatch(preview.candidate, encounter, t),
      };
    case "unassigned": {
      const selection = sent.find((row) => row.officialSlot === slot);
      return selection
        ? {
            slot,
            summary: t("encounter.selection.slot.missing", { slot }),
            match: t("encounter.selection.slot.match", {
              match: selection.providerMatchRef.externalId,
            }),
          }
        : { slot, summary: t("encounter.selection.slot.empty", { slot }), match: null };
    }
    default: {
      const exhaustive: never = preview;
      return exhaustive;
    }
  }
}

/** The full EA reference and when it was played, as the candidate list shows that time. */
function playedMatch(candidate: EncounterCandidateDto, encounter: EncounterViewDto, t: Translator) {
  return t("encounter.selection.slot.played", {
    match: candidate.reference.externalId,
    time: new Intl.DateTimeFormat(t.locale, {
      timeZone: encounter.competition.timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(candidate.occurredAt)),
  });
}
