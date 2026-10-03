import type { CompetitionDiscoverySort } from "@futrob/competitions";
import { z } from "zod";

export type DiscoveryCursor =
  | {
      readonly sort: "updated-desc";
      readonly updatedAt: string;
      readonly id: string;
    }
  | {
      readonly sort: "name-asc";
      readonly name: string;
      readonly id: string;
    };

const discoveryCursorSchema = z.union([
  z.object({
    sort: z.literal("updated-desc"),
    updatedAt: z.iso.datetime({ offset: true }),
    id: z.string().min(1),
  }),
  z.object({
    sort: z.literal("name-asc"),
    name: z.string().min(1),
    id: z.string().min(1),
  }),
]);

export function encodeDiscoveryCursor(cursor: DiscoveryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeDiscoveryCursor(
  raw: string | undefined,
  sort: CompetitionDiscoverySort,
): DiscoveryCursor | null {
  if (!raw) return null;
  try {
    const parsed = discoveryCursorSchema.safeParse(
      JSON.parse(Buffer.from(raw, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.sort !== sort) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
