export interface DomainEvent<TName extends string = string, TPayload extends object = object> {
  readonly eventName: TName;
  readonly occurredAt: string;
  readonly correlationId?: string;
  readonly payload: TPayload;
}
