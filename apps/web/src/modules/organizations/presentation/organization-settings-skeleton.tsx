import * as stylex from "@stylexjs/stylex";
import { applyStyles, Skeleton } from "@futrob/ui";
import { media } from "@futrob/ui/styles/media.stylex";

/** Bones sized to the profile form they reserve: name, slug, time zone, logo, save. */
const bones = stylex.create({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    gap: "0.5rem",
  },
  labelName: {
    width: "12rem",
    maxWidth: "80%",
    height: "0.75rem",
  },
  labelSlug: {
    width: "2.5rem",
    height: "0.75rem",
  },
  labelTimeZone: {
    width: "6.5rem",
    maxWidth: "70%",
    height: "0.75rem",
  },
  control: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
  description: {
    width: "100%",
    maxWidth: "22rem",
    height: { default: "2.375rem", [media.sm]: "1.125rem" },
  },
  logoRow: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "1rem",
  },
  logo: {
    width: "4rem",
    height: "4rem",
    flexShrink: 0,
    borderRadius: "var(--corner-full)",
  },
  logoCopy: {
    display: "grid",
    minWidth: 0,
    gap: "0.5rem",
  },
  labelLogo: {
    width: "4rem",
    height: "0.75rem",
  },
  logoDescription: {
    width: "100%",
    maxWidth: "18rem",
    height: "2rem",
  },
  logoAction: {
    width: "8rem",
    maxWidth: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
    justifySelf: "start",
  },
  submit: {
    width: "100%",
    height: "var(--control-height)",
    borderRadius: "var(--corner-lg)",
  },
});

const fieldLabels = {
  name: bones.labelName,
  slug: bones.labelSlug,
  timeZone: bones.labelTimeZone,
} as const;

function FieldSkeleton({ label }: { readonly label: keyof typeof fieldLabels }) {
  return (
    <div aria-hidden="true" {...applyStyles(bones.field)}>
      <Skeleton className={fieldLabels[label]} />
      <Skeleton className={bones.control} />
      <Skeleton className={bones.description} />
    </div>
  );
}

/**
 * Loading layout for organization settings. Mirrors the profile form so the
 * page does not jump when the read resolves.
 */
export function OrganizationSettingsFormSkeleton({ showSubmit }: { readonly showSubmit: boolean }) {
  return (
    <div data-slot="organization-settings-form-skeleton" {...applyStyles(bones.form)}>
      <div {...applyStyles(bones.fields)}>
        <FieldSkeleton label="name" />
        <FieldSkeleton label="slug" />
        <FieldSkeleton label="timeZone" />
        <div aria-hidden="true" {...applyStyles(bones.logoRow)}>
          <Skeleton className={bones.logo} />
          <div {...applyStyles(bones.logoCopy)}>
            <Skeleton className={bones.labelLogo} />
            <Skeleton className={bones.logoDescription} />
            <Skeleton className={bones.logoAction} />
          </div>
        </div>
      </div>
      {showSubmit ? <Skeleton aria-hidden="true" className={bones.submit} /> : null}
    </div>
  );
}
