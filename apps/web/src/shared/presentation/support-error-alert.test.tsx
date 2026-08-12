// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { SupportErrorAlert } from "./support-error-alert.tsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SupportErrorAlert", () => {
  it("copies only the request ID and announces the result", async () => {
    const requestId = "2170e2f6-a47e-4338-83c3-27c054630800";
    const writeText = vi.fn<(value: string) => Promise<void>>(async () => undefined);
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <SupportErrorAlert
        error={{ message: "No pudimos finalizar tu configuración.", requestId }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copiar código de soporte" }));

    expect(writeText).toHaveBeenCalledWith(requestId);
    expect(writeText).not.toHaveBeenCalledWith(expect.stringContaining("No pudimos"));
    expect(screen.getByText("Código copiado")).toBeTruthy();
  });

  it("omits the support code for legacy errors", () => {
    render(<SupportErrorAlert error={{ message: "No pudimos buscar clubs." }} />);

    expect(screen.getByText("No pudimos buscar clubs.")).toBeTruthy();
    expect(screen.queryByText(/Código de soporte/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Copiar código de soporte" })).toBeNull();
  });
});
