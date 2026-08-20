import { z } from "zod";

/** Values Base UI field validators may receive from form controls. */
export const formFieldValueSchema = z.union([
  z.string(),
  z.null(),
  z.undefined(),
  z.number(),
  z.boolean(),
  z.instanceof(File),
  z.array(z.string()),
]);

export type FormFieldValue = z.infer<typeof formFieldValueSchema>;

function isStringFormValue(value: FormFieldValue): value is string {
  return Object.prototype.toString.call(value) === "[object String]";
}

/**
 * Narrows Base UI `Field.validate` / form values to a string.
 * Non-string values (empty select, missing control) become `""`.
 */
export function readFormString(value: FormFieldValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  return isStringFormValue(value) ? value : "";
}
