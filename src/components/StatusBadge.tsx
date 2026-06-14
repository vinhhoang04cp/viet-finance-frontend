import { Badge, type BadgeProps } from "@/components/ui/badge";

/** Map a backend approval status to a badge style. */
function statusVariant(status: string): BadgeProps["variant"] {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "secondary";
    case "REJECTED":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Vietnamese display label for an approval status. Display-only — the raw backend
 * value (`status`) still drives the variant and is what the API receives.
 */
function statusLabel(status: string): string {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Từ chối";
    default:
      return status;
  }
}

/** Approval-status badge used by the revenue table. */
export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>;
}
