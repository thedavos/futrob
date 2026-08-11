"use client";

import { useCallback, useEffect, useState } from "react";

export function useRetryAfterCountdown() {
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (deadlineMs === null) return;

    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) setDeadlineMs(null);
    };

    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [deadlineMs]);

  const start = useCallback((seconds: number | undefined) => {
    if (!Number.isSafeInteger(seconds) || !seconds || seconds < 1) return;
    setRemainingSeconds(seconds);
    setDeadlineMs(Date.now() + seconds * 1000);
  }, []);

  return {
    blocked: remainingSeconds > 0,
    remainingSeconds,
    start,
  } as const;
}
