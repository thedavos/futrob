// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { useCopyToClipboard } from "@futrob/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies text and marks isCopied until timeout", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    let copied = false;
    await act(async () => {
      copied = await result.current.copyToClipboard("https://example.test/invite");
    });

    expect(copied).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://example.test/invite");
    expect(result.current.isCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when clipboard write fails and legacy copy is unavailable", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    const { result } = renderHook(() => useCopyToClipboard());

    let copied = true;
    await act(async () => {
      copied = await result.current.copyToClipboard("token");
    });

    expect(copied).toBe(false);
    expect(result.current.isCopied).toBe(false);
  });
});
