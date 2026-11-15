import { z } from "zod";

export const organizationAuditEntrySchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().nullable(),
  actorId: z.string().nullable(),
  actorName: z.string().nullable(),
  action: z.string().min(1),
  reason: z.string().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
  requestId: z.string().nullable(),
  object: z.object({
    type: z.string().min(1),
    id: z.string().min(1),
    label: z.string().nullable(),
    href: z
      .string()
      .regex(/^\/(?!\/)/)
      .nullable(),
  }),
});
export type OrganizationAuditEntryDto = z.infer<typeof organizationAuditEntrySchema>;

export const listOrganizationAuditQuerySchema = z
  .object({
    competitionId: z.string().trim().min(1).max(200).optional(),
    actorId: z.string().trim().min(1).max(200).optional(),
    action: z.string().trim().min(1).max(100).optional(),
    from: z.string().datetime({ offset: true }).optional(),
    to: z.string().datetime({ offset: true }).optional(),
    cursor: z.string().min(1).max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((query) => !query.from || !query.to || Date.parse(query.from) <= Date.parse(query.to), {
    path: ["to"],
    message: "The end of the date range must not precede its start",
  });
export type ListOrganizationAuditQuery = z.input<typeof listOrganizationAuditQuerySchema>;

export const listOrganizationAuditResponseSchema = z.object({
  entries: z.array(organizationAuditEntrySchema),
  nextCursor: z.string().nullable(),
});
export type ListOrganizationAuditResponse = z.infer<typeof listOrganizationAuditResponseSchema>;
