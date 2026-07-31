import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export type CompetitionStatus = "draft" | "published" | "paused" | "finished" | "archived";

export type CompetitionFormat = "league" | "knockout" | "groups-knockout" | "league-playoffs";

export type CompetitionRegion =
  | "america"
  | "south-america"
  | "north-central-america"
  | "europe"
  | "africa"
  | "asia"
  | "middle-east"
  | "oceania";

export type CompetitionPlatform =
  | "playstation"
  | "xbox"
  | "pc"
  | "nintendo-switch-1"
  | "nintendo-switch-2";

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
  readonly createdByActorId: ActorId;
  readonly creationKey?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
