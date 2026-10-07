import { RESULT_PERMISSION } from "@futrob/results";
import {
  WORKSPACE_SELECTION_KIND,
  type WorkspaceSelection,
} from "@/shared/presentation/shell/workspace-selection.ts";

export const ORGANIZATION_RECENT_ACTIVITY_LIMIT = 10;
export const ACTIVITY_FEED_PAGE_SIZE = 25;
/** The sidebar reads one page of pending work; the API caps a page at 50. */
export const PENDING_ACTIVITY_LIMIT = 50;

/**
 * Where the sidebar reads pending work for the active space. Operators of the organization
 * read its feed; everyone else reads their own rows (and their Teams'), narrowed to the space.
 */
export type PendingActivitySource =
  | {
      readonly kind: "organization";
      readonly organizationId: string;
      readonly competitionId?: string;
    }
  | {
      readonly kind: "mine";
      readonly organizationId?: string;
      readonly competitionId?: string;
    };

export function pendingActivitySource(
  selection: WorkspaceSelection,
  allowedPermissions: ReadonlySet<string>,
): PendingActivitySource {
  const operates = allowedPermissions.has(RESULT_PERMISSION.resultApprove);
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return { kind: "mine" };
    case WORKSPACE_SELECTION_KIND.organization:
      return operates
        ? { kind: "organization", organizationId: selection.organizationId }
        : { kind: "mine", organizationId: selection.organizationId };
    case WORKSPACE_SELECTION_KIND.competition:
      return operates && selection.organizationId
        ? {
            kind: "organization",
            organizationId: selection.organizationId,
            competitionId: selection.competitionId,
          }
        : { kind: "mine", competitionId: selection.competitionId };
  }
}
