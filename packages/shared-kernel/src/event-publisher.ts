import type { DomainEvent } from "./domain-event.ts";

export interface EventPublisherPort {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: readonly DomainEvent[]): Promise<void>;
}
