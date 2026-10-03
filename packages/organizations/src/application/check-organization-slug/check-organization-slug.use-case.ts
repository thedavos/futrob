import type { OrganizationId } from "@futrob/shared-kernel";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";
import {
  organizationSlugCandidates,
  parseOrganizationSlug,
} from "../../domain/value-objects/organization-slug.ts";

/** How many numbered variants are tried when looking for a free suggestion. */
const MAX_SUGGESTION_ATTEMPTS = 50;

export interface CheckOrganizationSlugInput {
  readonly slug: string;
  /** The slug already owned by this organization counts as available (editing). */
  readonly organizationId?: OrganizationId;
}

export type CheckOrganizationSlugResult =
  | { readonly available: true }
  | {
      readonly available: false;
      readonly reason: "invalid" | "taken";
      /** A valid, free slug close to the one asked for; `null` if none was found. */
      readonly suggestion: string | null;
    };

export class CheckOrganizationSlugUseCase {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(input: CheckOrganizationSlugInput): Promise<CheckOrganizationSlugResult> {
    const slug = parseOrganizationSlug(input.slug);
    if (!slug) {
      return {
        available: false,
        reason: "invalid",
        suggestion: await this.freeSuggestion(input.slug, input.organizationId),
      };
    }
    if (await this.isFree(slug, input.organizationId)) return { available: true };
    return {
      available: false,
      reason: "taken",
      suggestion: await this.freeSuggestion(slug, input.organizationId),
    };
  }

  private async isFree(slug: string, organizationId?: OrganizationId): Promise<boolean> {
    const owner = await this.organizations.getBySlug(slug);
    return owner === null || owner.id === organizationId;
  }

  private async freeSuggestion(
    text: string,
    organizationId?: OrganizationId,
  ): Promise<string | null> {
    let attempts = 0;
    for (const candidate of organizationSlugCandidates(text)) {
      if (await this.isFree(candidate, organizationId)) return candidate;
      attempts += 1;
      if (attempts === MAX_SUGGESTION_ATTEMPTS) return null;
    }
    return null;
  }
}
