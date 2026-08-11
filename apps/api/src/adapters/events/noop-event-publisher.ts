import type { DomainEvent, EventPublisherPort } from "@futrob/shared-kernel";

/** Temporary no-op until outbox/queue projection is wired. */
export class NoopEventPublisher implements EventPublisherPort {
  async publish(_event: DomainEvent): Promise<void> {}

  async publishMany(_events: readonly DomainEvent[]): Promise<void> {}
}
