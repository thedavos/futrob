import { auditObjectHref } from "./audit-object-href.ts";
import type { ActorContactReader } from "@futrob/identity";
import type {
  OrganizationAuditEntry,
  OrganizationAuditQuery,
  OrganizationAuditReaderPort,
  OrganizationAuditSourcePort,
} from "@futrob/organizations";
import { compareTime } from "@futrob/shared-kernel";

export function compareAuditEntries(
  left: OrganizationAuditEntry,
  right: OrganizationAuditEntry,
): number {
  return (
    compareTime(right.occurredAt, left.occurredAt) ||
    (left.id < right.id ? 1 : left.id > right.id ? -1 : 0)
  );
}

export function filterAuditEntries(
  entries: readonly OrganizationAuditEntry[],
  query: OrganizationAuditQuery,
): OrganizationAuditEntry[] {
  return entries
    .filter(
      (entry) =>
        entry.organizationId === query.organizationId &&
        (!query.competitionId || entry.competitionId === query.competitionId) &&
        (!query.actorId || entry.actorId === query.actorId) &&
        (!query.action || entry.action === query.action) &&
        (!query.from || compareTime(entry.occurredAt, query.from) >= 0) &&
        (!query.to || compareTime(entry.occurredAt, query.to) <= 0) &&
        (!query.cursor ||
          compareTime(entry.occurredAt, query.cursor.occurredAt) < 0 ||
          (compareTime(entry.occurredAt, query.cursor.occurredAt) === 0 &&
            entry.id < query.cursor.id)),
    )
    .sort(compareAuditEntries)
    .slice(0, query.limit + 1);
}

export class UnifiedOrganizationAuditReader implements OrganizationAuditReaderPort {
  constructor(
    private readonly sources: readonly OrganizationAuditSourcePort[],
    private readonly contacts: ActorContactReader,
  ) {}

  async read(query: OrganizationAuditQuery) {
    const entries = (await Promise.all(this.sources.map((source) => source.read(query))))
      .flat()
      .sort(compareAuditEntries);
    const page = entries.slice(0, query.limit);
    const actorIds = [...new Set(page.flatMap((entry) => (entry.actorId ? [entry.actorId] : [])))];
    const contacts = new Map(
      (await this.contacts.listByActorIds(actorIds)).map((contact) => [
        contact.actorId,
        contact.displayName,
      ]),
    );
    const last = page.at(-1);
    return {
      entries: page.map((entry) => ({
        ...entry,
        actorName: entry.actorId ? (contacts.get(entry.actorId) ?? null) : null,
        object: { ...entry.object, href: auditObjectHref(entry) },
      })),
      nextCursor:
        entries.length > query.limit && last ? { occurredAt: last.occurredAt, id: last.id } : null,
    };
  }
}
