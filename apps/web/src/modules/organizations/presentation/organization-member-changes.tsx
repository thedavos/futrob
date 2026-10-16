import { useId } from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import {
  applyStyles,
  Caption,
  Card,
  CardContent,
  CardHeader,
  Heading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@futrob/ui";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  MembersEmptyState,
  MembersRefreshNotice,
  MembersSectionFeedback,
} from "./organization-members-feedback.tsx";
import {
  formatMemberDate,
  type MembersSectionState,
  type OrganizationMemberChange,
} from "./organization-members-model.ts";
import { styles } from "./organization-members-sections.styles.ts";

export function OrganizationMemberChanges({
  state,
}: {
  readonly state: MembersSectionState<OrganizationMemberChange>;
}) {
  const { t, locale } = useI18n();
  const headingId = useId();
  return (
    <Card aria-labelledby={headingId} {...applyStyles(styles.panel, styles.history)}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("organizations.members.changes.title")}
        </Heading>
        <Caption>{t("organizations.members.changes.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        {state.kind !== "data" ? (
          <MembersSectionFeedback area="changes" state={state} />
        ) : (
          <>
            <MembersRefreshNotice state={state} />
            {state.items.length === 0 ? (
              <MembersEmptyState
                title={t("organizations.members.changes.emptyTitle")}
                description={t("organizations.members.changes.empty")}
                icon={
                  <ClockCounterClockwiseIcon aria-hidden="true" {...applyStyles(styles.icon)} />
                }
              />
            ) : (
              <Table
                aria-labelledby={headingId}
                containerClassName={styles.tableContainer}
                containerLabelledBy={headingId}
                dense
                {...applyStyles(styles.table)}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("organizations.members.changes.change")}</TableHead>
                    <TableHead scope="col">
                      {t("organizations.members.changes.performedBy")}
                    </TableHead>
                    <TableHead scope="col">{t("organizations.members.changes.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.items.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell>{change.description}</TableCell>
                      <TableCell>{change.performedBy}</TableCell>
                      <TableCell>
                        <time dateTime={change.occurredAt} {...applyStyles(styles.date)}>
                          {formatMemberDate(change.occurredAt, locale, true)} UTC
                        </time>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
