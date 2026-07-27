import type { ActorId } from "@futrob/shared-kernel";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import type { MembershipSummary } from "../../domain/value-objects/post-auth-destination.ts";

export interface ListMembershipsForActorInput {
  readonly actorId: ActorId;
}

export class ListMembershipsForActorUseCase {
  constructor(private readonly memberships: MembershipRepository) {}

  execute(input: ListMembershipsForActorInput): Promise<MembershipSummary[]> {
    return this.memberships.findByActor(input.actorId);
  }
}
