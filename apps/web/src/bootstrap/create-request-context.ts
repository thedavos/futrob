import type { ActorId, OrganizationId } from "@/shared/domain/identifiers.ts";
import type { AppContext } from "@/bootstrap/create-app-context.ts";
import { createModules, type AppModules } from "@/di/create-modules.ts";
import type { EventPublisherPort } from "@/shared/application/event-publisher.ts";
import type { ProviderMatchRepository } from "@/modules/game-data";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { ProductApiAuthorizationPort } from "@/context/product-api-authorization.port.ts";
import { ProductApiEncounterReader } from "@/context/product-api-encounter-reader.ts";

export interface RequestIdentity {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
}

export interface RequestContext {
  readonly app: AppContext;
  readonly identity: RequestIdentity;
  readonly modules: AppModules;
}

/** Temporary no-op publisher until outbox/queue adapter exists. */
class NoopEventPublisher implements EventPublisherPort {
  async publish(): Promise<void> {}
  async publishMany(): Promise<void> {}
}

class UnimplementedProviderMatchRepository implements ProviderMatchRepository {
  async upsertMany(): Promise<void> {}
  async findByExternalId() {
    return null;
  }
  async listBetweenClubs() {
    return [];
  }
}

export function createRequestContext(input: {
  readonly app: AppContext;
  readonly identity: RequestIdentity;
  readonly fetcher?: typeof fetch;
}): RequestContext {
  const productApi = createProductApiClient({
    actorId: input.identity.actorId,
    internalJobSecret: input.app.config.env.INTERNAL_JOB_SECRET,
    requestId: crypto.randomUUID(),
    fetchImpl: input.fetcher,
  });
  const modules = createModules({
    config: input.app.config,
    fetcher: input.fetcher ?? fetch,
    eventPublisher: new NoopEventPublisher(),
    encounterReader: new ProductApiEncounterReader(productApi),
    providerMatches: new UnimplementedProviderMatchRepository(),
    authorization: new ProductApiAuthorizationPort(input.identity.actorId, productApi),
  });

  return {
    app: input.app,
    identity: input.identity,
    modules,
  };
}
