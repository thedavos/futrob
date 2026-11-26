"use client";

import { applyStyles, Card, CardContent, PageHeader, Separator, Skeleton, vis } from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { styles as pageStyles } from "./competition-setup-page.styles.ts";
import { styles as stepStyles } from "./competition-setup-steps.styles.ts";
import { setupSkeleton as bones } from "./competition-setup-skeleton.styles.ts";

const STEPS = [0, 1, 2, 3, 4] as const;
const PRESETS = [0, 1, 2, 3] as const;

/**
 * Full-page loading layout for competition setup. Mirrors the information-step
 * wizard so the page does not jump when the draft resolves.
 */
export function CompetitionSetupSkeleton() {
  const { t } = useI18n();
  const label = t("competitions.setup.loading");

  return (
    <main aria-busy="true" aria-label={label} {...applyStyles(pageStyles.main)}>
      <span aria-label={label} role="status" {...applyStyles(vis.srOnly)}>
        {label}
      </span>
      <PageHeader>
        <div aria-hidden="true" {...applyStyles(pageStyles.titleRow)}>
          <Skeleton {...applyStyles(bones.title)} />
          <Skeleton {...applyStyles(bones.badge)} />
        </div>
        <Skeleton aria-hidden="true" {...applyStyles(bones.description)} />
      </PageHeader>
      <StepperSkeleton />
      <div aria-hidden="true" {...applyStyles(pageStyles.body)}>
        <InformationStepSkeleton />
      </div>
    </main>
  );
}

function StepperSkeleton() {
  return (
    <div aria-hidden="true" {...applyStyles(bones.stepper)}>
      <ol {...applyStyles(bones.stepperList)}>
        {STEPS.map((index) => (
          <li key={index} {...applyStyles(bones.stepperItem)}>
            {index < STEPS.length - 1 ? <span {...applyStyles(bones.stepperConnector)} /> : null}
            <Skeleton {...applyStyles(bones.stepperMarker)} />
            <Skeleton {...applyStyles(bones.stepperLabel)} />
          </li>
        ))}
      </ol>
      <Skeleton {...applyStyles(bones.stepperSummary)} />
    </div>
  );
}

function InformationStepSkeleton() {
  return (
    <div {...applyStyles(stepStyles.columns)}>
      <Card>
        <CardContent className={stepStyles.content}>
          <section {...applyStyles(stepStyles.section)}>
            <div {...applyStyles(stepStyles.subsection)}>
              <HeadingBone copy />
              <FieldBone />
              <div {...applyStyles(stepStyles.pair)}>
                <FieldBone />
                <FieldBone />
              </div>
              <div {...applyStyles(stepStyles.pair)}>
                <FieldBone />
                <FieldBone />
              </div>
            </div>
            <Separator />
            <div {...applyStyles(stepStyles.subsection)}>
              <HeadingBone copy />
              <div {...applyStyles(stepStyles.pair)}>
                <FieldBone hint />
                <FieldBone hint />
              </div>
            </div>
            <Separator />
            <div {...applyStyles(stepStyles.subsection)}>
              <HeadingBone badge />
              <div {...applyStyles(stepStyles.pair)}>
                <FieldBone hint />
                <FieldBone hint />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={stepStyles.content}>
          <div {...applyStyles(bones.identity)}>
            <HeadingBone copy />
            <div {...applyStyles(bones.preview)}>
              <Skeleton {...applyStyles(bones.artwork)} />
              <Skeleton {...applyStyles(bones.previewName)} />
              <Skeleton {...applyStyles(bones.previewMeta)} />
              <Skeleton {...applyStyles(bones.previewMeta)} />
            </div>
            <Skeleton {...applyStyles(bones.coverLabel)} />
            <div {...applyStyles(bones.presets)}>
              {PRESETS.map((index) => (
                <Skeleton key={index} {...applyStyles(bones.preset)} />
              ))}
            </div>
            <Skeleton {...applyStyles(bones.coverAction)} />
            <Skeleton {...applyStyles(bones.coverAction)} />
            <Skeleton {...applyStyles(bones.coverCaption)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HeadingBone({ badge = false, copy = false }: { badge?: boolean; copy?: boolean }) {
  return (
    <div {...applyStyles(bones.heading)}>
      <div {...applyStyles(pageStyles.titleRow)}>
        <Skeleton {...applyStyles(bones.headingTitle)} />
        {badge ? <Skeleton {...applyStyles(bones.headingBadge)} /> : null}
      </div>
      {copy ? <Skeleton {...applyStyles(bones.headingCopy)} /> : null}
    </div>
  );
}

function FieldBone({ hint = false }: { hint?: boolean }) {
  return (
    <div {...applyStyles(bones.field)}>
      <Skeleton {...applyStyles(bones.fieldLabel)} />
      <Skeleton {...applyStyles(bones.fieldControl)} />
      {hint ? <Skeleton {...applyStyles(bones.fieldHint)} /> : null}
    </div>
  );
}
