/** Signals an invariant defect that must not be represented as an expected Result error. */
export class Panic extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "Panic";
  }
}

/** Exhaustive-switch helper. Throws Panic when a new union member is unhandled at runtime. */
export function assertNever(value: never, message = "Unexpected value"): never {
  throw new Panic(`${message}: ${String(value)}`);
}
