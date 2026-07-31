import { normalizeOrganizationName } from "../../domain/entities/organization.ts";
import type { OrganizationRepository } from "../../domain/ports/organization.repository.ts";

export interface CheckOrganizationNameInput {
  readonly name: string;
}

export interface CheckOrganizationNameResult {
  readonly available: boolean;
}

export class CheckOrganizationNameUseCase {
  constructor(private readonly organizations: OrganizationRepository) {}

  async execute(input: CheckOrganizationNameInput): Promise<CheckOrganizationNameResult> {
    const normalizedName = normalizeOrganizationName(input.name);
    if (!normalizedName || input.name.trim().length > 120) return { available: false };
    return {
      available: (await this.organizations.getByNormalizedName(normalizedName)) === null,
    };
  }
}
