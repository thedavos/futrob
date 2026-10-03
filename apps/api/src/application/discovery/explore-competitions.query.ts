import {
  type GetDiscoverableCompetitionUseCase,
  type ListDiscoverableCompetitionsUseCase,
  type Competition,
  type CompetitionDiscoveryFilter,
  type DiscoverableCompetitionRecord,
  type GetDiscoverableCompetitionError,
} from "@futrob/competitions";
import type { OrganizationRepository } from "@futrob/organizations";
import { ok, type CompetitionId, type Result } from "@futrob/shared-kernel";

export interface ExploreCompetitionItem {
  readonly competition: Competition;
  readonly organization: { readonly id: string; readonly name: string };
  readonly approvedTeamCount: number;
}

export interface ExploreCompetitionsPage {
  readonly items: readonly ExploreCompetitionItem[];
  readonly total: number;
  readonly nextCursor: string | null;
}

export class ExploreCompetitionsQuery {
  constructor(
    private readonly deps: {
      readonly list: ListDiscoverableCompetitionsUseCase;
      readonly get: GetDiscoverableCompetitionUseCase;
      readonly organizations: OrganizationRepository;
    },
  ) {}

  async list(filter: CompetitionDiscoveryFilter): Promise<ExploreCompetitionsPage> {
    const page = await this.deps.list.execute(filter);
    const items = await this.withOrganizations(page.items);
    return { items, total: page.total, nextCursor: page.nextCursor };
  }

  async get(
    competitionId: CompetitionId,
  ): Promise<Result<ExploreCompetitionItem, GetDiscoverableCompetitionError>> {
    const result = await this.deps.get.execute({ competitionId });
    if (!result.isOk()) return result;
    const items = await this.withOrganizations([result.value]);
    const item = items[0] ?? {
      competition: result.value.competition,
      organization: {
        id: result.value.competition.organizationId,
        name: result.value.competition.organizationId,
      },
      approvedTeamCount: result.value.approvedTeamCount,
    };
    return ok(item);
  }

  private async withOrganizations(
    records: readonly DiscoverableCompetitionRecord[],
  ): Promise<readonly ExploreCompetitionItem[]> {
    if (records.length === 0) return [];
    const ids = [...new Set(records.map((record) => record.competition.organizationId))];
    const organizations = await this.deps.organizations.getByIds(ids);
    const names = new Map(
      organizations.map((organization) => [organization.id, organization.name]),
    );
    return records.map((record) => ({
      competition: record.competition,
      organization: {
        id: record.competition.organizationId,
        name: names.get(record.competition.organizationId) ?? record.competition.organizationId,
      },
      approvedTeamCount: record.approvedTeamCount,
    }));
  }
}
