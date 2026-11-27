export const poLifecycleSteps = [
  "DRAFT",
  "PENDING_FINANCE",
  "APPROVED",
  "SENT",
  "ACKNOWLEDGED",
  "SHIPPED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CLOSED",
];

const statusAliases: Record<string, string> = {
  DISPATCHED: "SHIPPED",
  PARTIAL_RECEIVED: "PARTIALLY_RECEIVED",
  PARTIAL: "PARTIALLY_RECEIVED",
  RECEIVED: "FULLY_RECEIVED",
};

export function getPoLifecycleIndex(status: unknown): number {
  const key = String(status ?? "").trim().toUpperCase();
  return poLifecycleSteps.indexOf(statusAliases[key] ?? key);
}
