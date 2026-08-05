import type { TeamId } from "@futrob/shared-kernel";
import type { ExternalClubConnection } from "../entities/external-club-connection.ts";

export interface ExternalClubConnectionRepository {
  findByTeam(teamId: TeamId): Promise<ExternalClubConnection | null>;
  upsert(connection: ExternalClubConnection): Promise<ExternalClubConnection>;
}
