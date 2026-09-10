import type { ReactNode } from "react";
import { applyStyles } from "@futrob/ui";
import { nextEncounterFixture } from "./home-next-encounter.styles.ts";

export function NextEncounterFixture({
  away,
  home,
  meta,
  vs,
}: {
  readonly away: ReactNode;
  readonly home: ReactNode;
  readonly meta: ReactNode;
  readonly vs: ReactNode;
}) {
  return (
    <div {...applyStyles(nextEncounterFixture.row)}>
      <div {...applyStyles(nextEncounterFixture.home)}>{home}</div>
      <div {...applyStyles(nextEncounterFixture.vsCell)}>{vs}</div>
      <div {...applyStyles(nextEncounterFixture.away)}>{away}</div>
      <div {...applyStyles(nextEncounterFixture.meta)}>{meta}</div>
    </div>
  );
}
