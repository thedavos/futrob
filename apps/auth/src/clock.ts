import type { ClockPort } from "@futrob/shared-kernel";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
