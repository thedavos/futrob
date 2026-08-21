import { Badge } from "@futrob/ui";
import { CheckCircleIcon, ClockCountdownIcon, XCircleIcon } from "@phosphor-icons/react";

export function EntryBadge({ status }: Readonly<{ status: "pending" | "approved" | "rejected" }>) {
  const icon =
    status === "approved" ? (
      <CheckCircleIcon aria-hidden="true" />
    ) : status === "rejected" ? (
      <XCircleIcon aria-hidden="true" />
    ) : (
      <ClockCountdownIcon aria-hidden="true" />
    );
  return (
    <Badge
      variant={
        status === "approved" ? "approved" : status === "rejected" ? "destructive" : "warning"
      }
    >
      {icon}
      {entryStatusLabel(status)}
    </Badge>
  );
}

export function entryStatusLabel(status: "pending" | "approved" | "rejected"): string {
  return status === "approved" ? "Aprobada" : status === "rejected" ? "Rechazada" : "Pendiente";
}
