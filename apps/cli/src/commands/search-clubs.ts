import { FutrobApiError } from "@futrob/sdk";
import { createCliFutrobClient, resolveApiBaseUrl } from "../lib/futrob-client.ts";
import { flagBoolean, flagString, parseFlags } from "../lib/parse-flags.ts";
import { print, printError, printJson } from "../lib/print.ts";

const USAGE = `Uso:
  npm run cli -- search-clubs <query> [--json] [--base-url URL]
    [--provider-key ea-clubs] [--platform common-gen5] [--game-edition fc26]

Requiere apps/web en marcha (npm run dev). Default base URL: http://localhost:3000/api/v1
Env: FUTROB_API_BASE_URL, FUTROB_ACCESS_TOKEN (opcional)`;

type SearchClubsCliArgs = {
  readonly query: string;
  readonly baseUrl: string;
  readonly json: boolean;
  readonly providerKey?: "ea-clubs" | "manual" | "screenshot-ocr";
  readonly platform?: string;
  readonly gameEdition?: string;
};

const PROVIDER_KEYS = new Set(["ea-clubs", "manual", "screenshot-ocr"]);

function parseProviderKey(
  value: string | undefined,
): SearchClubsCliArgs["providerKey"] | "invalid" | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (PROVIDER_KEYS.has(value)) {
    return value as SearchClubsCliArgs["providerKey"];
  }
  return "invalid";
}

function parseArgs(args: string[]): SearchClubsCliArgs | { error: string } {
  const { positionals, flags } = parseFlags(args);
  const query = positionals[0];
  if (!query) {
    return { error: "search-clubs requiere un query." };
  }

  const providerKey = parseProviderKey(flagString(flags, "provider-key"));
  if (providerKey === "invalid") {
    return { error: "provider-key inválido. Usa ea-clubs | manual | screenshot-ocr." };
  }

  return {
    query,
    baseUrl: resolveApiBaseUrl(flagString(flags, "base-url")),
    json: flagBoolean(flags, "json"),
    providerKey,
    platform: flagString(flags, "platform"),
    gameEdition: flagString(flags, "game-edition"),
  };
}

export async function run(args: string[]): Promise<number> {
  const parsed = parseArgs(args);
  if ("error" in parsed) {
    printError(parsed.error);
    printError(USAGE);
    return 1;
  }

  const client = createCliFutrobClient({ baseUrl: parsed.baseUrl });

  try {
    const response = await client.gameData.clubs.search({
      query: parsed.query,
      ...(parsed.providerKey !== undefined ? { providerKey: parsed.providerKey } : {}),
      ...(parsed.platform !== undefined ? { platform: parsed.platform } : {}),
      ...(parsed.gameEdition !== undefined ? { gameEdition: parsed.gameEdition } : {}),
    });

    if (parsed.json) {
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
  } catch (error) {
    if (error instanceof FutrobApiError) {
      printError(`API ${error.status}: ${error.code} (${error.messageKey})`);
      if (error.details !== undefined) {
        printError(JSON.stringify(error.details));
      }
      return 1;
    }

    const message = error instanceof Error ? error.message : String(error);
    printError(`Request failed: ${message}`);
    printError(`Is npm run dev running? Tried ${parsed.baseUrl}`);
    return 1;
  }
}
