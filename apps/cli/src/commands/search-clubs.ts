import { Effect } from "effect";
import type { SearchClubsQueryInput } from "@futrob/api-contracts";
import { requirePositionals } from "../lib/args.ts";
import { apiCall } from "../lib/futrob-client.ts";
import type { ClientConfig } from "../lib/futrob-client.ts";
import type { CliError } from "../lib/errors.ts";
import { UsageError } from "../lib/errors.ts";
import { flagString, parseCommon } from "../lib/parse-flags.ts";
import { print, printJson } from "../lib/print.ts";

export const USAGE = `Uso:
  npm run cli -- club-search <query> [--json]
    [--provider-key ea-clubs|manual|screenshot-ocr] [--platform p] [--game-edition e]`;

type Args = {
  readonly config: ClientConfig;
  readonly json: boolean;
  readonly query: string;
  readonly providerKey?: "ea-clubs" | "manual" | "screenshot-ocr";
  readonly platform?: string;
  readonly gameEdition?: string;
};

const PROVIDER_KEYS = ["ea-clubs", "manual", "screenshot-ocr"] as const;

function parseProviderKey(value: string | undefined): Args["providerKey"] {
  return PROVIDER_KEYS.find((key) => key === value);
}

function parseArgs(raw: string[]): Effect.Effect<Args, UsageError> {
  return Effect.gen(function* () {
    const common = parseCommon(raw);
    const [query] = yield* requirePositionals(common.positionals, 1, USAGE);

    const providerKeyRaw = flagString(common.flags, "provider-key");
    if (providerKeyRaw !== undefined && parseProviderKey(providerKeyRaw) === undefined) {
      return yield* new UsageError({
        message: `provider-key inválido: ${providerKeyRaw}. Usa ${PROVIDER_KEYS.join(" | ")}.`,
        usage: USAGE,
      });
    }

    return {
      config: { baseUrl: common.baseUrl, actorId: common.actorId },
      json: common.json,
      query,
      providerKey: parseProviderKey(providerKeyRaw),
      platform: flagString(common.flags, "platform"),
      gameEdition: flagString(common.flags, "game-edition"),
    };
  });
}

function buildSearchInput(args: Args): SearchClubsQueryInput {
  const input: SearchClubsQueryInput = { query: args.query };
  if (args.providerKey !== undefined) input.providerKey = args.providerKey;
  if (args.platform !== undefined) input.platform = args.platform;
  if (args.gameEdition !== undefined) input.gameEdition = args.gameEdition;
  return input;
}

export function run(raw: string[]): Effect.Effect<number, CliError> {
  return Effect.gen(function* () {
    const args = yield* parseArgs(raw);
    const response = yield* apiCall(args.config, (client) =>
      client.gameData.clubs.search(buildSearchInput(args)),
    );

    if (args.json) {
      printJson(response);
      return 0;
    }
    if (response.clubs.length === 0) {
      print("No clubs found.");
      return 0;
    }
    for (const club of response.clubs) {
      print(
        `${club.externalClubId}\t${club.name}\t${club.platform}\t${club.gameEdition}\t${club.providerKey}`,
      );
    }
    return 0;
  });
}
