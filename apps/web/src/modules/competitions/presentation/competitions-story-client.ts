import type {
  CreateCompetitionDraftRequest,
  CreateCompetitionDraftResponse,
  ApplyToCompetitionRequest,
  ApplyToCompetitionResponse,
  GetMyCompetitionApplicationResponse,
  ExploreCompetitionsQueryInput,
  ExploreCompetitionsResponse,
  GetExploreCompetitionResponse,
  ListAccessibleCompetitionsResponse,
  ListCompetitionParticipantsResponse,
  ListOrganizationCompetitionsResponse,
  ListOrganizationTeamsResponse,
  RequestId,
} from "@futrob/api-contracts";

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

let explore: CompetitionsStoryQueryState<ExploreCompetitionsResponse> = {
  items: [],
  total: 0,
  nextCursor: null,
};

let exploreNext: ExploreCompetitionsResponse | null = null;

let exploreDetail: CompetitionsStoryQueryState<GetExploreCompetitionResponse> | "not-found" = {
  competition: {
    id: "competition-story",
    organizationId: "org-story",
    name: "Liga Story",
    status: "published",
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "america",
    timeZone: "America/Lima",
    format: "league",
    teams: { min: 2, max: null },
    schedule: { startsOn: null, endsOn: null },
    cover: { kind: "preset", preset: "cup" },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-02T00:00:00.000Z",
  },
  organization: { id: "org-story", name: "Liga Story" },
  approvedTeamCount: 2,
};

let application: CompetitionsStoryQueryState<GetMyCompetitionApplicationResponse> = {
  application: null,
};

let organizationCompetitions: CompetitionsStoryQueryState<ListOrganizationCompetitionsResponse> = {
  competitions: [],
};

let organizationTeams: CompetitionsStoryQueryState<ListOrganizationTeamsResponse> = { teams: [] };

let organizationParticipants: Record<
  string,
  CompetitionsStoryQueryState<ListCompetitionParticipantsResponse>
> = {};

export function configureCompetitionsStory(next: {
  readonly application?: CompetitionsStoryQueryState<GetMyCompetitionApplicationResponse>;
  readonly competitions?: CompetitionsStoryQueryState<ListAccessibleCompetitionsResponse>;
  readonly explore?: CompetitionsStoryQueryState<ExploreCompetitionsResponse>;
  readonly exploreNext?: ExploreCompetitionsResponse | null;
  readonly exploreDetail?: CompetitionsStoryQueryState<GetExploreCompetitionResponse> | "not-found";
  readonly organizationCompetitions?: CompetitionsStoryQueryState<ListOrganizationCompetitionsResponse>;
  readonly organizationTeams?: CompetitionsStoryQueryState<ListOrganizationTeamsResponse>;
  readonly organizationParticipants?: Record<
    string,
    CompetitionsStoryQueryState<ListCompetitionParticipantsResponse>
  >;
}): void {
  if (next.competitions !== undefined) competitions = next.competitions;
  if (next.explore !== undefined) {
    explore = next.explore;
    if (next.exploreNext === undefined) exploreNext = null;
  }
  if (next.exploreNext !== undefined) exploreNext = next.exploreNext;
  if (next.exploreDetail !== undefined) exploreDetail = next.exploreDetail;
  if (next.application !== undefined) application = next.application;
  if (next.organizationCompetitions !== undefined) {
    organizationCompetitions = next.organizationCompetitions;
  }
  if (next.organizationTeams !== undefined) organizationTeams = next.organizationTeams;
  if (next.organizationParticipants !== undefined) {
    organizationParticipants = next.organizationParticipants;
  }
}

export function getMyCompetitionApplication(): Promise<GetMyCompetitionApplicationResponse> {
  return resolveQuery(application);
}

export async function applyToCompetition(
  _competitionId: string,
  input: ApplyToCompetitionRequest,
): Promise<ApplyToCompetitionResponse> {
  const created: ApplyToCompetitionResponse = {
    entryId: "entry-story",
    status: "pending",
    teamId: "team-story",
    teamName: input.teamName,
    createdAt: "2026-09-27T12:00:00.000Z",
  };
  application = { application: created };
  return created;
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

export function exploreCompetitions(
  query: ExploreCompetitionsQueryInput = {},
): Promise<ExploreCompetitionsResponse> {
  if (query.cursor && exploreNext) return Promise.resolve(exploreNext);
  return resolveQuery(explore);
}

export async function getExploreCompetition(
  competitionId?: string,
): Promise<GetExploreCompetitionResponse> {
  if (exploreDetail === "not-found") {
    return Promise.reject(new CompetitionsClientError(404, "competitions.not_discoverable"));
  }
  if (exploreDetail !== "pending" && exploreDetail !== "error" && competitionId) {
    if (exploreDetail.competition.id === competitionId) return exploreDetail;
    if (explore !== "pending" && explore !== "error") {
      const found = explore.items.find((item) => item.competition.id === competitionId);
      if (found) return found;
    }
  }
  return resolveQuery(exploreDetail);
}

export function listOrganizationCompetitions(): Promise<ListOrganizationCompetitionsResponse> {
  return resolveQuery(organizationCompetitions);
}

export async function getCompetitionDraft() {
  throw new CompetitionsClientError(404, "competitions.not_found");
}

let lastCreateInput: CreateCompetitionDraftRequest | null = null;
let uploadedCovers: string[] = [];

/** Storybook assertions read what the form actually sent. */
export function competitionsStoryRequests() {
  return { lastCreateInput, uploadedCovers };
}

export function resetCompetitionsStoryRequests(): void {
  lastCreateInput = null;
  uploadedCovers = [];
}

export async function uploadCompetitionCover(
  organizationId: string,
  creationKey: string,
  file: File,
): Promise<{ readonly key: string }> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const key = `competition-covers/${organizationId}/${creationKey}.${ext}`;
  uploadedCovers = [...uploadedCovers, key];
  return { key };
}

export async function updateCompetitionCover() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}

export async function createCompetitionDraft(
  organizationId: string,
  input: CreateCompetitionDraftRequest,
): Promise<CreateCompetitionDraftResponse> {
  lastCreateInput = input;
  return {
    competition: {
      id: "competition-created",
      organizationId,
      name: input.name,
      status: "draft",
      modality: "fc-clubs",
      gameEdition: input.gameEdition,
      platform: input.platform,
      region: input.region,
      timeZone: input.timeZone,
      format: input.format,
      teams: input.teams ?? { min: 2, max: null },
      schedule: input.schedule ?? { startsOn: null, endsOn: null },
      cover: input.cover ?? { kind: "preset", preset: "cup" },
      createdAt: "2026-09-28T12:00:00.000Z",
      updatedAt: "2026-09-28T12:00:00.000Z",
    },
    rules: {
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: "2026-09-28T12:00:00.000Z",
    },
  };
}

export async function updateCompetitionDraft() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}

export function listCompetitionParticipants(
  _organizationId: string,
  competitionId: string,
): Promise<ListCompetitionParticipantsResponse> {
  return resolveQuery(organizationParticipants[competitionId] ?? { participants: [] });
}

export function listOrganizationTeams(): Promise<ListOrganizationTeamsResponse> {
  return resolveQuery(organizationTeams);
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

export async function setCompetitionRegistration() {
  throw new CompetitionsClientError(503, "competitions.unavailable");
}
