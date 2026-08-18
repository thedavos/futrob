// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ClubCrestAvatar } from "./club-crest-avatar.tsx";

describe("ClubCrestAvatar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the crest image when imageUrl is present", () => {
    const { container } = render(
      <ClubCrestAvatar imageUrl="https://example.com/crest.png" name="Night Owls" />,
    );

    const image = container.querySelector('[data-slot="club-crest-image"]');
    expect(image).toBeTruthy();
    expect(image?.getAttribute("src")).toBe("https://example.com/crest.png");
    expect(image?.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("falls back to initials when imageUrl is null", () => {
    const { container } = render(<ClubCrestAvatar imageUrl={null} name="Night Owls" />);
    expect(container.textContent).toContain("NO");
  });

  it("falls back to initials when the crest fails to load", () => {
    const { container } = render(
      <ClubCrestAvatar imageUrl="https://example.com/broken.png" name="Night Owls" />,
    );
    const image = container.querySelector('[data-slot="club-crest-image"]');
    expect(image).toBeTruthy();
    fireEvent.error(image!);
    expect(container.textContent).toContain("NO");
  });

  it("omits the circular frame when framed is false", () => {
    const { container } = render(
      <ClubCrestAvatar framed={false} imageUrl="https://example.com/crest.png" name="Night Owls" />,
    );
    const avatar = container.querySelector('[data-slot="club-crest-avatar"]');
    const image = container.querySelector('[data-slot="club-crest-image"]');
    expect(avatar?.className).not.toContain("rounded-full");
    expect(image?.className).toContain("outline-none");
  });
});
