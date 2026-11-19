/**
 * Formats a numeric value into Ethiopian Birr (ETB) currency representation.
 */
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formats a Date object into a readable date label (e.g., "Mon, Jan 15").
 */
export function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Formats an ISO date or timestamp into a local Ethiopian/standard time string safely.
 */
export function formatSafeTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
