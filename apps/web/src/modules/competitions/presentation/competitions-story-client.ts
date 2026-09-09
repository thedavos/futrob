import type { ListAccessibleCompetitionsResponse, RequestId } from "@futrob/api-contracts";

/** Storybook-only client. Production code keeps `competitions-browser-client.ts`. */
export class CompetitionsClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
  ) {
    super(code);
    this.name = "CompetitionsClientError";
  }
}

export type CompetitionsStoryQueryState<T> = "pending" | "error" | T;

const hang = <T>(): Promise<T> => new Promise(() => undefined);

let competitions: CompetitionsStoryQueryState<ListAccessibleCompetitionsResponse> = {
  competitions: [],
};

export function configureCompetitionsStory(next: {
  readonly competitions: CompetitionsStoryQueryState<ListAccessibleCompetitionsResponse>;
}): void {
  competitions = next.competitions;
}

function resolveQuery<T>(value: CompetitionsStoryQueryState<T>): Promise<T> {
  if (value === "pending") return hang();
  if (value === "error") {
    return Promise.reject(new CompetitionsClientError(503, "competitions.unavailable"));
  }
  return Promise.resolve(value);
}

export function listMyAccessibleCompetitions(): Promise<ListAccessibleCompetitionsResponse> {
  return resolveQuery(competitions);
}

export async function listOrganizationCompetitions() {
  return { competitions: [] };
}

export async function getCompetitionDraft() {
  throw new CompetitionsClientError(404, "competitions.not_found");
}

export async function createCompetitionDraft() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}

export async function updateCompetitionDraft() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}

export async function listCompetitionParticipants() {
  return { participants: [] };
}

export async function listOrganizationTeams() {
  return { teams: [] };
}

export async function addCompetitionParticipant() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}

export async function removeCompetitionParticipant(): Promise<void> {
  return undefined;
}

export async function publishCompetition() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}
