// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { useRetryAfterCountdown } from "./use-retry-after-countdown.ts";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-11T18:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useRetryAfterCountdown", () => {
  it("blocks immediately and releases retry when the server wait expires", () => {
    const { result } = renderHook(() => useRetryAfterCountdown());

    act(() => result.current.start(3));
    expect(result.current.remainingSeconds).toBe(3);
    expect(result.current.blocked).toBe(true);

    void act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.remainingSeconds).toBe(1);

    void act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.blocked).toBe(false);
  });
});
