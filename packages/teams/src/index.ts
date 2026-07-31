export type { ExternalClubConnection } from "./domain/entities/external-club-connection.ts";
export type { PlayerProfile } from "./domain/entities/player-profile.ts";
export {
  normalizeGameAccountIdentifier,
  type GamePlatform,
  type PlayerGameAccount,
} from "./domain/entities/player-game-account.ts";
export type { PlayerProfileRepository } from "./domain/ports/player-profile.repository.ts";
export type { PlayerGameAccountRepository } from "./domain/ports/player-game-account.repository.ts";
export { EnsurePlayerProfileUseCase } from "./application/ensure-player-profile/ensure-player-profile.use-case.ts";
export {
  AddPlayerGameAccountUseCase,
  type AddPlayerGameAccountInput,
} from "./application/add-player-game-account/add-player-game-account.use-case.ts";
export {
  GetPlayerProfileUseCase,
  type PlayerProfileDetails,
} from "./application/get-player-profile/get-player-profile.use-case.ts";
