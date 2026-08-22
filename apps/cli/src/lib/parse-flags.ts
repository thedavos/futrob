import { resolveApiBaseUrl } from "./futrob-client.ts";

export type ParsedFlags = {
  readonly positionals: string[];
  readonly flags: Record<string, string | true>;
};

/**
 * Parses `--key value`, `--key=value`, and boolean `--flag` tokens.
 * Positionals are everything else, in order.
 */
export function parseFlags(args: string[]): ParsedFlags {
  const positionals: string[] = [];
  const flags: Record<string, string | true> = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === undefined) {
      break;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const body = token.slice(2);
    if (body.length === 0) {
      positionals.push(token);
      continue;
    }

    const eq = body.indexOf("=");
    if (eq !== -1) {
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      flags[key] = value;
      continue;
    }

    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[body] = next;
      i += 1;
      continue;
    }

    flags[body] = true;
  }

  return { positionals, flags };
}

export function flagString(flags: Record<string, string | true>, key: string): string | undefined {
  const value = flags[key];
  if (value === true || value === undefined) {
    return undefined;
  }
  if (value.length > 0) {
    return value;
  }
  return undefined;
}

export function flagBoolean(flags: Record<string, string | true>, key: string): boolean {
  return flags[key] === true || flags[key] === "true";
}

export type CommonArgs = {
  readonly positionals: string[];
  readonly flags: Record<string, string | true>;
  readonly json: boolean;
  readonly baseUrl: string;
  readonly actorId?: string;
};

/** Shared flags for API-backed commands: `--json`, `--base-url URL`, `--actor ID`. */
export function parseCommon(args: string[]): CommonArgs {
  const { positionals, flags } = parseFlags(args);
  return {
    positionals,
    flags,
    json: flagBoolean(flags, "json"),
    baseUrl: resolveApiBaseUrl(flagString(flags, "base-url")),
    actorId: flagString(flags, "actor") ?? process.env.FUTROB_ACTOR_ID,
  };
}
