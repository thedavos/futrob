import {
  err,
  ok,
  type EventPublisherPort,
  type OrganizationId,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { GameDataProviderKey } from "@futrob/game-data";
import type { ExternalClubConnection } from "../../domain/entities/external-club-connection.ts";
import type { ExternalClubConnectedEvent } from "../../domain/events/team.events.ts";
import {
  TeamNotFound,
  type ConnectTeamExternalClubError,
} from "../../domain/errors/team.errors.ts";
import type { ExternalClubConnectionRepository } from "../../domain/ports/external-club-connection.repository.ts";
import type { TeamRepository } from "../../domain/ports/team.repository.ts";

export interface ConnectTeamExternalClubInput {
  readonly organizationId: OrganizationId;
  readonly teamId: TeamId;
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly externalClubName: string;
  readonly gameEdition: string;
  readonly platform: string;
}

export class ConnectTeamExternalClubUseCase {
  constructor(
    private readonly deps: {
      readonly teams: TeamRepository;
      readonly connections: ExternalClubConnectionRepository;
      readonly eventPublisher?: EventPublisherPort;
    },
  ) {}

  async execute(
    input: ConnectTeamExternalClubInput,
  ): Promise<Result<ExternalClubConnection, ConnectTeamExternalClubError>> {
    const team = await this.deps.teams.findById(input.organizationId, input.teamId);
    if (!team) {
      return err(
        new TeamNotFound({
          code: "teams.not_found",
          message: "Team not found",
        }),
      );
    }

    const connection: ExternalClubConnection = {
      teamId: input.teamId,
      providerKey: input.providerKey,
      externalClubId: input.externalClubId,
      externalClubName: input.externalClubName,
      gameEdition: input.gameEdition,
      platform: input.platform,
    };
    const saved = await this.deps.connections.upsert(connection);

    if (this.deps.eventPublisher) {
      const event: ExternalClubConnectedEvent = {
        eventName: "teams.external-club-connected",
        occurredAt: new Date().toISOString(),
        payload: {
          teamId: input.teamId,
          providerKey: input.providerKey,
          externalClubId: input.externalClubId,
        },
      };
      await this.deps.eventPublisher.publish(event);
    }

    return ok(saved);
  }
}
