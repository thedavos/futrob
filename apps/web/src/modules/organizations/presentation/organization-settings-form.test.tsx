// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  OrganizationProfileDto,
  OrganizationSlugAvailabilityRequest,
  OrganizationSlugAvailabilityResponse,
  SetOrganizationLogoRequest,
  UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { OrganizationSettingsForm } from "./organization-settings-form.tsx";

const mocks = vi.hoisted(() => ({
  checkSlug:
    vi.fn<
      (input: OrganizationSlugAvailabilityRequest) => Promise<OrganizationSlugAvailabilityResponse>
    >(),
  updateProfile:
    vi.fn<
      (
        organizationId: string,
        input: UpdateOrganizationProfileRequest,
      ) => Promise<OrganizationProfileDto>
    >(),
  uploadLogo:
    vi.fn<(organizationId: string, uploadKey: string, file: File) => Promise<{ key: string }>>(),
  setLogo:
    vi.fn<
      (organizationId: string, input: SetOrganizationLogoRequest) => Promise<OrganizationProfileDto>
    >(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      checkSlugAvailability: (input: OrganizationSlugAvailabilityRequest) => mocks.checkSlug(input),
      updateProfile: (organizationId: string, input: UpdateOrganizationProfileRequest) =>
        mocks.updateProfile(organizationId, input),
      uploadLogo: (organizationId: string, uploadKey: string, file: File) =>
        mocks.uploadLogo(organizationId, uploadKey, file),
      setLogo: (organizationId: string, input: SetOrganizationLogoRequest) =>
        mocks.setLogo(organizationId, input),
    },
  };
});

const profile: OrganizationProfileDto = {
  organizationId: "org-1",
  name: "Liga Norte",
  slug: "liga-norte",
  timeZone: "America/Lima",
  logo: { kind: "monogram" },
};

const withCrest: OrganizationProfileDto = {
  ...profile,
  logo: { kind: "upload", key: "organization-logos/org-1/crest-1.png" },
};

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  mocks.checkSlug.mockResolvedValue({ available: true });
});

afterEach(() => {
  cleanup();
  for (const mock of Object.values(mocks)) mock.mockReset();
});

function renderForm(stored: OrganizationProfileDto = profile, canEdit = true) {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <OrganizationSettingsForm canEdit={canEdit} profile={stored} />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

const nameField = () => screen.getByRole("textbox", { name: "Nombre de la organización" });
const slugField = () => screen.getByRole("textbox", { name: "Slug" });
const saveButton = () => screen.getByRole("button", { name: "Guardar cambios" });

function pickFile(container: HTMLElement, file: File) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not rendered");
  fireEvent.change(input, { target: { files: [file] } });
}

function clientError(code: string, status = 409) {
  return new OrganizationsClientError({ status, code, message: code });
}

describe("OrganizationSettingsForm", () => {
  it("shows the stored profile and keeps saving disabled until something changes", () => {
    renderForm();

    expect(nameField()).toHaveValue("Liga Norte");
    expect(slugField()).toHaveValue("liga-norte");
    expect(saveButton()).toBeDisabled();

    fireEvent.change(nameField(), { target: { value: "Liga del Norte" } });
    expect(saveButton()).toBeEnabled();

    fireEvent.change(nameField(), { target: { value: "Liga Norte" } });
    expect(saveButton()).toBeDisabled();
  });

  it("sends only the fields that changed and confirms the save", async () => {
    mocks.updateProfile.mockResolvedValueOnce({ ...profile, name: "Liga del Norte" });
    renderForm();

    fireEvent.change(nameField(), { target: { value: "  Liga del Norte " } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Cambios guardados.")).toBeVisible();
    expect(mocks.updateProfile).toHaveBeenCalledWith("org-1", { name: "Liga del Norte" });
    expect(mocks.checkSlug).not.toHaveBeenCalled();
    expect(saveButton()).toBeDisabled();
  });

  it("checks a changed slug against the organization itself and saves when it is free", async () => {
    mocks.updateProfile.mockResolvedValueOnce({ ...profile, slug: "norte-fc" });
    renderForm();

    fireEvent.change(slugField(), { target: { value: "Norte-FC" } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith("org-1", { slug: "norte-fc" }),
    );
    expect(mocks.checkSlug).toHaveBeenCalledWith({ slug: "norte-fc", organizationId: "org-1" });
  });

  it("refuses a taken slug with a suggestion and saves nothing", async () => {
    mocks.checkSlug.mockResolvedValueOnce({
      available: false,
      reason: "taken",
      suggestion: "liga-sur-2",
    });
    renderForm();

    fireEvent.change(slugField(), { target: { value: "liga-sur" } });
    fireEvent.change(nameField(), { target: { value: "Liga del Norte" } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Ese slug ya está en uso.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Usar «liga-sur-2»" })).toBeVisible();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
    await waitFor(() => expect(slugField()).toHaveFocus());
    expect(nameField()).toHaveValue("Liga del Norte");
  });

  it("shows a slug conflict raised by the server on the slug field and keeps the other edits", async () => {
    mocks.updateProfile.mockRejectedValueOnce(clientError("organizations.slug_conflict"));
    renderForm();

    fireEvent.change(slugField(), { target: { value: "liga-sur" } });
    fireEvent.change(nameField(), { target: { value: "Liga del Norte" } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Ese slug ya está en uso.")).toBeVisible();
    expect(nameField()).toHaveValue("Liga del Norte");
    expect(screen.queryByText("Cambios guardados.")).toBeNull();
  });

  it("shows a name conflict on the name field", async () => {
    mocks.updateProfile.mockRejectedValueOnce(clientError("organizations.name_conflict"));
    renderForm();

    fireEvent.change(nameField(), { target: { value: "Liga Sur" } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Ese nombre ya está en uso. Elige otro.")).toBeVisible();
    await waitFor(() => expect(nameField()).toHaveFocus());
  });

  it("rejects an empty name without calling the API", async () => {
    renderForm();

    fireEvent.change(nameField(), { target: { value: "   " } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Escribe el nombre de la organización.")).toBeVisible();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("uploads a new logo, registers it and confirms", async () => {
    mocks.uploadLogo.mockResolvedValueOnce({ key: "organization-logos/org-1/up-1.png" });
    mocks.setLogo.mockResolvedValueOnce({
      ...profile,
      logo: { kind: "upload", key: "organization-logos/org-1/up-1.png" },
    });
    const { container } = renderForm();
    const file = new File(["png"], "crest.png", { type: "image/png" });

    pickFile(container, file);
    fireEvent.click(saveButton());

    expect(await screen.findByText("Cambios guardados.")).toBeVisible();
    expect(mocks.uploadLogo).toHaveBeenCalledWith("org-1", expect.any(String), file);
    expect(mocks.setLogo).toHaveBeenCalledWith("org-1", {
      logo: { kind: "upload", key: "organization-logos/org-1/up-1.png" },
    });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("saves the profile changes even when the logo upload fails, and says so", async () => {
    mocks.updateProfile.mockResolvedValueOnce({ ...profile, name: "Liga del Norte" });
    mocks.uploadLogo.mockRejectedValueOnce(clientError("media.upload_failed", 500));
    const { container } = renderForm();

    fireEvent.change(nameField(), { target: { value: "Liga del Norte" } });
    pickFile(container, new File(["png"], "crest.png", { type: "image/png" }));
    fireEvent.click(saveButton());

    expect(
      await screen.findByText(
        "Guardamos los cambios, pero no pudimos subir el escudo. Inténtalo nuevamente.",
      ),
    ).toBeVisible();
    expect(mocks.updateProfile).toHaveBeenCalledWith("org-1", { name: "Liga del Norte" });
    expect(mocks.setLogo).not.toHaveBeenCalled();
    expect(screen.queryByText("Cambios guardados.")).toBeNull();
    expect(saveButton()).toBeEnabled();
  });

  it("removes a stored logo by going back to the monogram without uploading anything", async () => {
    mocks.setLogo.mockResolvedValueOnce(profile);
    renderForm(withCrest);

    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    fireEvent.click(saveButton());

    expect(await screen.findByText("Cambios guardados.")).toBeVisible();
    expect(mocks.setLogo).toHaveBeenCalledWith("org-1", { logo: { kind: "monogram" } });
    expect(mocks.uploadLogo).not.toHaveBeenCalled();
  });

  it("does not offer to remove a logo the organization does not have", () => {
    renderForm();

    expect(screen.queryByRole("button", { name: "Quitar escudo" })).toBeNull();
    expect(screen.getByRole("button", { name: "Subir escudo" })).toBeVisible();
  });

  it("is read-only without permission: fields disabled and no save button", () => {
    renderForm(profile, false);

    expect(nameField()).toBeDisabled();
    expect(slugField()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
    expect(screen.getByRole("button", { name: "Subir escudo" })).toBeDisabled();
  });
});
