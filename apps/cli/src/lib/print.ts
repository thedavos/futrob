import type { SearchClubsResponse } from "@futrob/api-contracts";
import type { SelectionStatus } from "@futrob/results";
import type { Encounter } from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";

export type DomainSmokeJsonOutput = {
  readonly encounter: Encounter;
  readonly selectionStatus: SelectionStatus;
  readonly result: {
    readonly encounterId: EncounterId;
    readonly selectionStatus: SelectionStatus;
  };
};

export type CliJsonOutput = SearchClubsResponse | DomainSmokeJsonOutput;

export function print(message: string): void {
  console.log(message);
}

export function printError(message: string): void {
  console.error(message);
}

export function printJson(value: CliJsonOutput): void {
  console.log(JSON.stringify(value, null, 2));
}
