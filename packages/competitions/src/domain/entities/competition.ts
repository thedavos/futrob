import type { ActorId, CompetitionId, OrganizationId, GamePlatform } from "@futrob/shared-kernel";
import type { CompetitionCover } from "../value-objects/competition-cover.ts";
import type { CompetitionSchedule } from "../value-objects/competition-schedule.ts";
import type { TeamRange } from "../value-objects/team-range.ts";

export type CompetitionStatus =
  | "draft"
  | "registration"
  | "published"
  | "paused"
  | "finished"
  | "archived";

export type CompetitionFormat =
  | "league"
  | "knockout"
  | "groups-knockout"
  | "league-playoffs"
  | "swiss";

export type CompetitionRegion =
  | "america"
  | "south-america"
  | "north-central-america"
  | "europe"
  | "africa"
  | "asia"
  | "middle-east"
  | "oceania";

export type CompetitionPlatform = GamePlatform;

/**
 * Whether Explore lists the competition. An unlisted one stays reachable by direct link, so
 * participants and applicants keep their way in.
 */
export const COMPETITION_EXPLORE_LISTINGS = ["listed", "unlisted"] as const;
export type CompetitionExploreListing = (typeof COMPETITION_EXPLORE_LISTINGS)[number];

export interface Competition {
  readonly id: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly status: CompetitionStatus;
  readonly modality: "fc-clubs";
  readonly gameEdition: string;
  readonly platform: CompetitionPlatform;
  readonly region: CompetitionRegion;
  readonly timeZone: string;
  readonly format: CompetitionFormat;
  readonly teams: TeamRange;
  readonly schedule: CompetitionSchedule;
  readonly cover: CompetitionCover;
  readonly exploreListing: CompetitionExploreListing;
  readonly createdByActorId: ActorId;
  readonly creationKey?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
