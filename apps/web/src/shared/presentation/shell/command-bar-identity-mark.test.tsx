// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { CommandBarIdentityMark } from "./command-bar-identity-mark.tsx";

describe("CommandBarIdentityMark", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders EA logo, gamertag, club crest and club name in that order", () => {
    const { container } = render(
      <CommandBarIdentityMark
        emptyLabel="Espacio personal"
        identity={{
          gamertag: "davos282",
          clubName: "Fera Enjaulada",
          imageUrl: null,
        }}
      />,
    );

    const row = container.querySelector("p");
    expect(row?.textContent).toContain("davos282");
    expect(row?.textContent).toContain("Fera Enjaulada");
    const ea = row?.querySelector("[data-ea-logo]");
    const crest = row?.querySelector("[data-slot='club-crest-avatar']");
    expect(ea).toBeTruthy();
    expect(crest).toBeTruthy();
    expect(
      ea && crest && Boolean(ea.compareDocumentPosition(crest) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it("renders nothing while the profile is loading", () => {
    const { container } = render(
      <CommandBarIdentityMark
        emptyLabel="Espacio personal"
        identity={{ gamertag: "davos282", clubName: "Fera Enjaulada", imageUrl: null }}
        ready={false}
      />,
    );
    expect(container.textContent).toBe("");
  });
});
