import type { ClockPort } from "@futrob/shared-kernel";

export interface Clock extends ClockPort {
  isoNow(): string;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  isoNow(): string {
    return this.now().toISOString();
  }
}
