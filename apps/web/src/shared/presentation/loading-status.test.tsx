// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { LOADING_STATUS_DELAY_MS, LoadingStatus } from "./loading-status.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("LoadingStatus", () => {
  it("mounts empty and writes the message only after the region is registered", () => {
    render(<LoadingStatus message="Cargando clubes…" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(LOADING_STATUS_DELAY_MS - 1);
    });
    expect(status.textContent).toBe("");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(status.textContent).toBe("Cargando clubes…");
  });

  it("clears the same node at once and never writes a message that resolved early", () => {
    const { rerender } = render(<LoadingStatus message="Cargando clubes…" />);
    const status = screen.getByRole("status");

    rerender(<LoadingStatus message="" />);
    act(() => {
      vi.advanceTimersByTime(LOADING_STATUS_DELAY_MS);
    });
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("");
  });
});
