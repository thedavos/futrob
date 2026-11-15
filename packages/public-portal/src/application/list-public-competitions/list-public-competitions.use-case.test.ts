import { describe, expect, it } from "vite-plus/test";
import type { CompetitionStatus } from "@futrob/competitions";
import { asPublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type {
  PublishedCompetitionDirectoryEntry,
  PublishedCompetitionDirectoryPort,
} from "../../domain/ports/published-competition-directory.port.ts";
import {
  ListPublicCompetitionsUseCase,
  MAX_PUBLIC_COMPETITIONS,
} from "./list-public-competitions.use-case.ts";

function entry(
  slug: string,
  competition: string,
  status: CompetitionStatus,
  updatedAt: string,
): PublishedCompetitionDirectoryEntry {
  return {
    key: asPublicCompetitionKey(slug, competition),
    status,
    updatedAt: new Date(updatedAt),
  };
}

function directory(
  entries: readonly PublishedCompetitionDirectoryEntry[],
): PublishedCompetitionDirectoryPort & { readonly calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    async listByStatus(statuses, limit) {
      calls.push([statuses, limit]);
      return entries;
    },
  };
}

describe("ListPublicCompetitionsUseCase", () => {
  it("lists published, paused and finished competitions by their public address, newest first", async () => {
    const source = directory([
      entry("liga-norte", "copa-barranco", "published", "2026-11-01T10:00:00.000Z"),
      entry("liga-sur", "torneo-apertura", "finished", "2026-11-05T10:00:00.000Z"),
      entry("liga-norte", "copa-invierno", "paused", "2026-11-03T10:00:00.000Z"),
    ]);

    const result = await new ListPublicCompetitionsUseCase(source).execute();

    expect(result.competitions).toEqual([
      {
        organizationSlug: "liga-sur",
        competitionKey: "torneo-apertura",
        updatedAt: new Date("2026-11-05T10:00:00.000Z"),
      },
      {
        organizationSlug: "liga-norte",
        competitionKey: "copa-invierno",
        updatedAt: new Date("2026-11-03T10:00:00.000Z"),
      },
      {
        organizationSlug: "liga-norte",
        competitionKey: "copa-barranco",
        updatedAt: new Date("2026-11-01T10:00:00.000Z"),
      },
    ]);
    expect(source.calls).toEqual([[["published", "paused", "finished"], MAX_PUBLIC_COMPETITIONS]]);
  });

  it("drops anything the source returns that is not publicly visible", async () => {
    const source = directory([
      entry("liga-norte", "borrador", "draft", "2026-11-01T10:00:00.000Z"),
      entry("liga-norte", "inscripciones", "registration", "2026-11-01T10:00:00.000Z"),
      entry("liga-norte", "archivada", "archived", "2026-11-01T10:00:00.000Z"),
      entry("liga-norte", "copa-barranco", "published", "2026-11-01T10:00:00.000Z"),
    ]);

    const result = await new ListPublicCompetitionsUseCase(source).execute();

    expect(result.competitions.map((item) => item.competitionKey)).toEqual(["copa-barranco"]);
  });

  it("answers an empty list when nothing is published", async () => {
    const result = await new ListPublicCompetitionsUseCase(directory([])).execute();

    expect(result).toEqual({ competitions: [] });
  });
});
