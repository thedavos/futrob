import { WarningCircleIcon } from "@phosphor-icons/react";

export function FieldsetError({
  id,
  children,
}: {
  readonly id: string;
  readonly children: string | null;
}) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-normal text-danger" id={id}>
      <WarningCircleIcon aria-hidden="true" className="mt-0.5 size-3 shrink-0" strokeWidth={1.5} />
      <span>{children}</span>
    </p>
  );
}
