import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type {
  CalendarDate,
  CompetitionCover,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
  CompetitionStatus,
} from "@futrob/competitions";
import type { PublicCompetitionKey } from "../public-competition-key.ts";

/**
 * Internal coordinates of a competition. They let the other reader ports query by scope
 * and never appear in a public projection.
 */
export interface PublicCompetitionScope {
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
}

/** Narrow source for the portada. It carries no actor, creation key or invitation data. */
export interface PublicCompetitionSource {
  readonly scope: PublicCompetitionScope;
  readonly name: string;
  readonly status: CompetitionStatus;
  readonly format: CompetitionFormat;
  readonly platform: CompetitionPlatform;
  readonly gameEdition: string;
  readonly region: CompetitionRegion;
  readonly timeZone: string;
  readonly startsOn: CalendarDate | null;
  readonly endsOn: CalendarDate | null;
  readonly cover: CompetitionCover;
  readonly approvedTeamCount: number;
}

export interface PublishedCompetitionReaderPort {
  /** Resolves a public key to a competition in any status; the use case applies visibility. */
  findByKey(key: PublicCompetitionKey): Promise<PublicCompetitionSource | null>;
}
