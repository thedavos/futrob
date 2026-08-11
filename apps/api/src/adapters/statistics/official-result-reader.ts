import type { OfficialResultReaderPort, OfficialResultRepository } from "@futrob/results";

export class RepositoryOfficialResultReader implements OfficialResultReaderPort {
  constructor(private readonly results: OfficialResultRepository) {}

  getApprovedByEncounter(
    encounterId: Parameters<OfficialResultReaderPort["getApprovedByEncounter"]>[0],
  ) {
    return this.results.findApprovedByEncounter(encounterId);
  }

  getById(officialResultId: string) {
    return this.results.findById(officialResultId);
  }
}
