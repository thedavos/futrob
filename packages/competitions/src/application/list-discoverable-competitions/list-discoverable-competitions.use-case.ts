import type {
  CompetitionDiscoveryFilter,
  CompetitionDiscoveryReader,
  DiscoverableCompetitionPage,
} from "../../domain/ports/competition-discovery.reader.ts";

export class ListDiscoverableCompetitionsUseCase {
  constructor(private readonly discovery: CompetitionDiscoveryReader) {}

  execute(input: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage> {
    return this.discovery.list(input);
  }
}
