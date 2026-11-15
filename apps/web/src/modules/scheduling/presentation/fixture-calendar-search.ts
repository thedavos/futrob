import { z } from "zod";

const month = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
const day = z
  .string()
  .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  .refine((value) => {
    const instant = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, 10) === value;
  });

/** Query choices survive leaving the calendar, browser Back, reload and a shared link. */
export const fixtureCalendarSearchSchema = z.object({
  view: z.enum(["agenda", "month", "rounds"]).optional().catch(undefined),
  team: z.string().min(1).optional().catch(undefined),
  round: z.string().min(1).optional().catch(undefined),
  month: month.optional().catch(undefined),
  day: day.optional().catch(undefined),
});

export type FixtureCalendarSearch = z.infer<typeof fixtureCalendarSearchSchema>;
