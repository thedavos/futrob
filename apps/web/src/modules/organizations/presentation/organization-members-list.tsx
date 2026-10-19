import { useId } from "react";
import { orgMembershipRoleSchema } from "@futrob/api-contracts";
import { DotsThreeIcon, MagnifyingGlassIcon, UsersIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import {
  applyStyles,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  CardHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Field,
  Heading,
  InputWithIcon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  type MemberRoleFilter,
  type MembersSectionState,
  type OrganizationMemberView,
} from "./organization-members-model.ts";
import { styles } from "./organization-members-sections.styles.ts";

const listStyles = stylex.create({
  filters: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      "@container (min-width: 40rem)": "minmax(0, 1fr) minmax(8rem, 10rem)",
    },
  },
  actions: { width: "3rem", textAlign: "center" },
  identityCell: { position: "relative" },
  selectedName: { fontWeight: 600 },
  selectionBar: {
    position: "absolute",
    insetInlineStart: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    pointerEvents: "none",
  },
});

export function OrganizationMembersList({
  state,
  selectedId,
  detailId,
  onSelect,
  query,
  role,
  visibleMembers: members,
  onFiltersChange,
}: {
  readonly state: MembersSectionState<OrganizationMemberView>;
  readonly selectedId: string | null;
  readonly detailId: string;
  readonly onSelect: (id: string) => void;
  readonly query: string;
  readonly role: MemberRoleFilter;
  readonly visibleMembers: readonly OrganizationMemberView[];
  readonly onFiltersChange: (query: string, role: MemberRoleFilter) => void;
}) {
  const { t } = useI18n();
  const headingId = useId();
  const roleItems = ["all", ...orgMembershipRoleSchema.options].map((value) => ({
    value,
    label:
      value === "all"
        ? t("organizations.members.allRoles")
        : t(`shell.workspace.role.${orgMembershipRoleSchema.parse(value)}`),
  }));
  const actionsCell = applyStyles(listStyles.actions);
  const medium = applyStyles(styles.mediumText);

  function clearFilters() {
    onFiltersChange("", "all");
  }

  return (
    <Card aria-labelledby={headingId} className={styles.panel}>
      <CardHeader className={styles.header}>
        <Heading className={styles.heading} id={headingId}>
          {t("organizations.members.list.title")}
        </Heading>
        <Caption>{t("organizations.members.list.description")}</Caption>
      </CardHeader>
      <CardContent className={styles.content}>
        {state.kind !== "data" ? (
          <MembersSectionFeedback area="list" state={state} />
        ) : (
          <>
            <MembersRefreshNotice state={state} />
            {state.items.length === 0 ? (
              <MembersEmptyState
                title={t("organizations.members.list.emptyTitle")}
                description={t("organizations.members.list.empty")}
                icon={<UsersIcon aria-hidden="true" {...applyStyles(styles.icon)} />}
              />
            ) : (
              <>
                <div {...applyStyles(listStyles.filters)}>
                  <Field name="members-search">
                    <InputWithIcon
                      aria-label={t("organizations.members.search")}
                      dense
                      onChange={(event) => onFiltersChange(event.target.value, role)}
                      placeholder={t("organizations.members.search")}
                      startIcon={MagnifyingGlassIcon}
                      value={query}
                    />
                  </Field>
                  <Field name="members-role-filter">
                    <Select
                      items={roleItems}
                      onValueChange={(value) => {
                        if (value === "all") onFiltersChange(query, value);
                        else {
                          const parsed = orgMembershipRoleSchema.safeParse(value);
                          if (parsed.success) onFiltersChange(query, parsed.data);
                        }
                      }}
                      value={role}
                    >
                      <SelectTrigger aria-label={t("organizations.members.roleFilter")} dense>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={medium.className} style={medium.style}>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                {members.length === 0 ? (
                  <MembersEmptyState
                    title={t("organizations.members.list.noMatches")}
                    description={
                      query.trim()
                        ? t("organizations.members.list.noMatchesFor", { query: query.trim() })
                        : t("organizations.members.list.noMatchesHint")
                    }
                    action={
                      <Button onClick={clearFilters} type="button" variant="outline">
                        {t("organizations.members.clearFilters")}
                      </Button>
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
                        <TableHead scope="col">{t("organizations.members.member")}</TableHead>
                        <TableHead scope="col">{t("organizations.members.roleFilter")}</TableHead>
                        <TableHead scope="col">
                          {t("organizations.members.competitionAccess")}
                        </TableHead>
                        <TableHead
                          className={actionsCell.className}
                          scope="col"
                          style={actionsCell.style}
                        >
                          {t("organizations.members.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow
                          key={member.id}
                          aria-controls={detailId}
                          aria-selected={selectedId === member.id}
                          data-state={selectedId === member.id ? "selected" : undefined}
                          onClick={() => onSelect(member.id)}
                          onKeyDown={(event) => {
                            if (
                              event.target === event.currentTarget &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              onSelect(member.id);
                            }
                          }}
                          tabIndex={0}
                          className={styles.selectableRow}
                        >
                          <TableCell className={applyStyles(listStyles.identityCell).className}>
                            {selectedId === member.id ? (
                              <span aria-hidden="true" {...applyStyles(listStyles.selectionBar)} />
                            ) : null}
                            <div {...applyStyles(styles.identity)}>
                              <Avatar aria-hidden="true">
                                <AvatarFallback>{member.name.slice(0, 1)}</AvatarFallback>
                              </Avatar>
                              <div {...applyStyles(styles.copy)}>
                                <span
                                  {...applyStyles(
                                    styles.name,
                                    selectedId === member.id && listStyles.selectedName,
                                  )}
                                >
                                  {member.name}
                                </span>
                                {member.email ? (
                                  <Caption {...applyStyles(styles.secondary)}>
                                    {member.email}
                                  </Caption>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge>{t(`shell.workspace.role.${member.role}`)}</Badge>
                          </TableCell>
                          <TableCell>
                            <Caption>
                              {member.access.kind === "inherited"
                                ? t("organizations.members.allCompetitions")
                                : member.access.kind === "none"
                                  ? t("organizations.members.noCompetitions")
                                  : [
                                      member.access.kind === "inherited-with-restriction"
                                        ? t("organizations.members.restrictedAccess")
                                        : null,
                                      member.access.competitions
                                        .map((competition) =>
                                          competition.read === "denied"
                                            ? `${competition.name} (${t("organizations.members.accessDenied")})`
                                            : competition.name,
                                        )
                                        .join(", "),
                                    ]
                                      .filter(Boolean)
                                      .join(": ")}
                            </Caption>
                          </TableCell>
                          <TableCell className={actionsCell.className} style={actionsCell.style}>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                onClick={(event) => event.stopPropagation()}
                                render={
                                  <Button
                                    aria-label={t("organizations.members.actionsFor", {
                                      name: member.name,
                                    })}
                                    dense
                                    size="icon"
                                    type="button"
                                    variant="ghost"
                                  />
                                }
                              >
                                <DotsThreeIcon aria-hidden="true" size={20} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className={medium.className}
                                style={medium.style}
                              >
                                <DropdownMenuItem
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onSelect(member.id);
                                  }}
                                >
                                  {t("organizations.members.viewDetails")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
