import { TaggedError } from "@futrob/shared-kernel";

/** Transport / upstream HTTP failure from a game-data provider. */
export class ProviderHttpFailed extends TaggedError("ProviderHttpFailed")<{
  /** Wire-stable; today only EA Clubs sets this code. */
  code: "game_data.ea_clubs_http_error";
  message: string;
  status: number;
  path: string;
  body: unknown;
}> {}

export class ProviderTimeout extends TaggedError("ProviderTimeout")<{
  code: "game_data.ea_clubs_timeout";
  message: string;
  path: string;
  cause: string;
}> {}

export class ProviderNetworkError extends TaggedError("ProviderNetworkError")<{
  code: "game_data.ea_clubs_network_error";
  message: string;
  path: string;
  cause: string;
}> {}

export class ProviderSchemaError extends TaggedError("ProviderSchemaError")<{
  code: "game_data.ea_clubs_schema_error";
  message: string;
  issues: unknown;
}> {}

export class ExternalClubNotFound extends TaggedError("ExternalClubNotFound")<{
  code: "game_data.external_club_not_found";
  message: string;
  externalClubId: string;
}> {}

export class UnsupportedGameDataOperation extends TaggedError("UnsupportedGameDataOperation")<{
  code: "game_data.unsupported_operation";
  message: string;
}> {}

export class ProviderNotImplemented extends TaggedError("ProviderNotImplemented")<{
  code: "game_data.provider_not_implemented";
  message: string;
}> {}

export type ProviderTransportError = ProviderHttpFailed | ProviderTimeout | ProviderNetworkError;

export type ProviderError =
  | ProviderTransportError
  | ProviderSchemaError
  | ExternalClubNotFound
  | UnsupportedGameDataOperation
  | ProviderNotImplemented;
