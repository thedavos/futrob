import { z } from "zod";

export const clientHttpErrorSchema = z.object({
  status: z.number().int(),
});

export type ClientHttpError = z.infer<typeof clientHttpErrorSchema>;

export function isClientHttpError(error: ClientHttpError): boolean {
  return error.status >= 400 && error.status < 500;
}
