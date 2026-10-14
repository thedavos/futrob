"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let lastNowMs = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

function emitTick(): void {
  lastNowMs = Date.now();
  for (const listener of listeners) listener();
}

function subscribeSecondTicks(listener: () => void): () => void {
  listeners.add(listener);
  if (intervalId === null) {
    lastNowMs = Date.now();
    intervalId = setInterval(emitTick, 1_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function noopSubscribe(): () => void {
  return () => undefined;
}

function getNowSnapshot(): number {
  return lastNowMs === 0 ? Date.now() : lastNowMs;
}

function getZero(): number {
  return 0;
}

function remainingSecondsFrom(deadlineMs: number | null, nowMs: number): number {
  if (deadlineMs === null) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function useRetryAfterCountdown() {
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const ticking = deadlineMs !== null;
  const nowMs = useSyncExternalStore(
    ticking ? subscribeSecondTicks : noopSubscribe,
    ticking ? getNowSnapshot : getZero,
    getZero,
  );
  const remainingSeconds = remainingSecondsFrom(deadlineMs, ticking ? nowMs : Date.now());

  if (deadlineMs !== null && remainingSeconds === 0) {
    setDeadlineMs(null);
  }

  const start = useCallback((seconds: number | undefined) => {
    if (!Number.isSafeInteger(seconds) || !seconds || seconds < 1) return;
    lastNowMs = Date.now();
    setDeadlineMs(lastNowMs + seconds * 1000);
  }, []);

  return {
    blocked: remainingSeconds > 0,
    remainingSeconds,
    start,
  } as const;
}
