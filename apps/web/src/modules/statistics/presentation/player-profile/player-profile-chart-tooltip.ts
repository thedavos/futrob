import { z } from "zod";

const tooltipEntrySchema = z.object({
  dataKey: z.string().optional(),
  name: z.string().optional(),
  value: z.number().optional(),
});

export const chartTooltipContentSchema = z.object({
  label: z.union([z.string(), z.number()]).optional(),
  payload: z.array(tooltipEntrySchema).optional(),
});

export type ChartTooltipContent = {
  readonly label: string;
  readonly dataKey: string | undefined;
  readonly name: string | undefined;
  readonly value: number | undefined;
};

export function chartTooltipFromParsed(
  parsed: z.infer<typeof chartTooltipContentSchema>,
): ChartTooltipContent {
  const entry = parsed.payload?.[0];
  return {
    label: parsed.label === undefined ? "" : String(parsed.label),
    dataKey: entry?.dataKey,
    name: entry?.name,
    value: entry?.value,
  };
}
