import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Badge,
  Caption,
  Card,
  CardContent,
  CardHeader,
  EmptyStateIcon,
  Heading,
  MetaItem,
  MetaList,
  MetaTerm,
  MetaValue,
  SectionTitle,
} from "@futrob/ui";
import memberAccessUrl from "@/assets/illustration-permissions.png";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  OrganizationMemberGrants,
  OrganizationMemberRoleEditor,
} from "./organization-member-access-controls.tsx";
import { MembersEmptyState } from "./organization-members-feedback.tsx";
import {
  formatMemberDate,
  type MemberAccessManagement,
  type OrganizationMemberView,
} from "./organization-members-model.ts";
import { styles } from "./organization-members-sections.styles.ts";

export function OrganizationMemberDetail({
  member,
  id,
  manage,
}: {
  readonly member: OrganizationMemberView | null;
  readonly id: string;
  readonly manage?: MemberAccessManagement;
}) {
  const { t, locale } = useI18n();
  const headingId = `${id}-title`;
  return (
    <Card aria-labelledby={headingId} className={styles.panel} id={id}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("organizations.members.detail.title")}
        </Heading>
        <Caption>{t("organizations.members.detail.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        {member === null ? (
          <MembersEmptyState
            title={t("organizations.members.detail.emptyTitle")}
            description={t("organizations.members.detail.empty")}
            icon={
              <EmptyStateIcon>
                <img alt="" data-outline="none" height={1280} src={memberAccessUrl} width={1280} />
              </EmptyStateIcon>
            }
          />
        ) : (
          <div aria-live="polite" {...applyStyles(styles.detail)}>
            <div {...applyStyles(styles.identity)}>
              <Avatar aria-hidden="true">
                <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div {...applyStyles(styles.copy)}>
                <Heading as="h3" className={styles.heading}>
                  {member.name}
                </Heading>
                <Caption {...applyStyles(styles.secondary)}>
                  {member.email ?? t("organizations.members.emailUnavailable")}
                </Caption>
              </div>
            </div>
            <MetaList>
              <MetaItem>
                <MetaTerm>{t("organizations.members.role")}</MetaTerm>
                <MetaValue>
                  <Badge>{t(`shell.workspace.role.${member.role}`)}</Badge>
                </MetaValue>
              </MetaItem>
              <MetaItem>
                <MetaTerm>{t("organizations.members.joinedAt")}</MetaTerm>
                <MetaValue>
                  {member.joinedAt ? (
                    <time dateTime={member.joinedAt}>
                      {formatMemberDate(member.joinedAt, locale)}
                    </time>
                  ) : (
                    t("organizations.members.dateUnavailable")
                  )}
                </MetaValue>
              </MetaItem>
            </MetaList>
            {manage?.roles ? (
              <OrganizationMemberRoleEditor
                actorId={member.id}
                key={`${member.id}:${member.role}`}
                organizationId={manage.organizationId}
                role={member.role}
              />
            ) : null}
            {manage?.grants ? (
              <OrganizationMemberGrants
                actorId={member.id}
                organizationId={manage.organizationId}
              />
            ) : null}
            <div {...applyStyles(styles.copy)}>
              <SectionTitle as="h3">{t("organizations.members.competitionAccess")}</SectionTitle>
              {member.access.kind === "inherited" ? (
                <Caption>{t("organizations.members.allCompetitions")}</Caption>
              ) : member.access.kind === "none" ? (
                <Caption>{t("organizations.members.noCompetitions")}</Caption>
              ) : (
                <>
                  {member.access.kind === "inherited-with-restriction" ? (
                    <Caption>{t("organizations.members.restrictedAccess")}</Caption>
                  ) : null}
                  {member.access.competitions.length === 0 ? (
                    <Caption>{t("organizations.members.noVisibleCompetitions")}</Caption>
                  ) : null}
                  <ul {...applyStyles(styles.accessList)}>
                    {member.access.competitions.map((competition) => (
                      <li key={competition.id} {...applyStyles(styles.copy)}>
                        <span {...applyStyles(styles.name)}>{competition.name}</span>
                        <Caption>
                          {competition.read === "denied"
                            ? t("organizations.members.accessDenied")
                            : competition.role === null
                              ? t("organizations.members.authorizedAccess")
                              : competition.role === "vice_captain"
                                ? t("roster.role.vice_captain")
                                : t(`shell.workspace.role.${competition.role}`)}
                        </Caption>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
