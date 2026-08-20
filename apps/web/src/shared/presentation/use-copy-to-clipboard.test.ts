// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { useCopyToClipboard } from "@futrob/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

describe("useCopyToClipboard", () => {
  let writeText: ReturnType<typeof vi.fn<(text: string) => Promise<void>>>;

  beforeEach(() => {
    writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
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
    expect(writeText).toHaveBeenCalledWith("https://example.test/invite");
    expect(result.current.isCopied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isCopied).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when clipboard write fails and legacy copy is unavailable", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn<(command: string) => boolean>().mockReturnValue(false),
    });

    const { result } = renderHook(() => useCopyToClipboard());

    let copied = true;
    await act(async () => {
      copied = await result.current.copyToClipboard("token");
    });

    expect(copied).toBe(false);
    expect(result.current.isCopied).toBe(false);
  });

  it("clears isCopied when a later copy fails or the value is empty", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 0 }));

    await act(async () => {
      await result.current.copyToClipboard("first");
    });
    expect(result.current.isCopied).toBe(true);

    await act(async () => {
      await result.current.copyToClipboard("");
    });
    expect(result.current.isCopied).toBe(false);

    await act(async () => {
      await result.current.copyToClipboard("second");
    });
    expect(result.current.isCopied).toBe(true);

    writeText.mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn<(command: string) => boolean>().mockReturnValue(false),
    });

    let copied = true;
    await act(async () => {
      copied = await result.current.copyToClipboard("third");
    });
    expect(copied).toBe(false);
    expect(result.current.isCopied).toBe(false);
    vi.useRealTimers();
  });
});
