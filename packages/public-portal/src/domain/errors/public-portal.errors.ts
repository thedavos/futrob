import { TaggedError } from "@futrob/shared-kernel";

/**
 * One failure for every reason a spectator cannot see a competition: unknown key, draft,
 * registration, archived. The caller learns nothing about which one applied.
 */
export class PublicCompetitionNotFound extends TaggedError("PublicCompetitionNotFound")<{
  code: "public_portal.competition_not_found";
  message: string;
}> {}

export type PublicPortalReadError = PublicCompetitionNotFound;
