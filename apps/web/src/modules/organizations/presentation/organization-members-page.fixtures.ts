import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import type {
  OrganizationMemberChange,
  OrganizationMemberView,
} from "./organization-members-model.ts";

export const MEMBERS_FIXTURE: readonly OrganizationMemberView[] = [
  {
    id: "member-ana",
    name: "Ana Torres",
    email: "ana@example.com",
    role: "organizer",
    joinedAt: "2026-08-01T12:00:00.000Z",
    access: { kind: "inherited" },
  },
  {
    id: "member-marcos",
    name: "Marcos Díaz",
    email: "marcos@example.com",
    role: "staff",
    joinedAt: "2026-09-12T12:00:00.000Z",
    access: { kind: "inherited" },
  },
  {
    id: "member-lucia",
    name: "Lucía Pérez",
    email: "lucia@example.com",
    role: "member",
    joinedAt: "2026-09-18T12:00:00.000Z",
    access: {
      kind: "assigned",
      competitions: [
        { id: "competition-league", name: "Liga Apertura", role: "captain", read: "allowed" },
        { id: "competition-cup", name: "Copa Futrob", role: "player", read: "allowed" },
      ],
    },
  },
  {
    id: "member-diego",
    name: "Diego Rojas",
    email: null,
    role: "member",
    joinedAt: null,
    access: { kind: "none" },
  },
];

export const MEMBERS_ACCESS_FIXTURE: readonly OrganizationMemberView[] = MEMBERS_FIXTURE.map(
  (member) =>
    member.id === "member-marcos"
      ? {
          ...member,
          access: {
            kind: "inherited-with-restriction",
            competitions: [
              { id: "restricted-cup", name: "Copa restringida", read: "denied", role: null },
              { id: "roleless-cup", name: "Copa con acceso", read: "allowed", role: null },
              { id: "vice-cup", name: "Copa de subcapitán", read: "allowed", role: "vice_captain" },
            ],
          },
        }
      : member,
);

export function memberChangesFixture(locale: Locale): readonly OrganizationMemberChange[] {
  return [
    {
      id: "change-1",
      description:
        locale === "es"
          ? "Lucía Pérez recibió acceso a Liga Apertura."
          : "Lucía Pérez was granted access to Liga Apertura.",
      performedBy: "Ana Torres",
      occurredAt: "2026-10-15T18:40:00.000Z",
    },
    {
      id: "change-2",
      description:
        locale === "es"
          ? "Marcos Díaz cambió de miembro a staff."
          : "Marcos Díaz changed from member to staff.",
      performedBy: "Ana Torres",
      occurredAt: "2026-10-15T17:25:00.000Z",
    },
    {
      id: "change-3",
      description:
        locale === "es"
          ? "Diego Rojas se incorporó a la organización."
          : "Diego Rojas joined the organization.",
      performedBy: "Diego Rojas",
      occurredAt: "2026-10-14T20:15:00.000Z",
    },
  ];
}
