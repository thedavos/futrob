import type { TeamId } from "@futrob/shared-kernel";
import type { ExternalClubConnection } from "../../domain/entities/external-club-connection.ts";
import type { ExternalClubConnectionRepository } from "../../domain/ports/external-club-connection.repository.ts";

export class GetTeamExternalClubUseCase {
  constructor(private readonly connections: ExternalClubConnectionRepository) {}

  async execute(input: { readonly teamId: TeamId }): Promise<ExternalClubConnection | null> {
    return this.connections.findByTeam(input.teamId);
  }
}
