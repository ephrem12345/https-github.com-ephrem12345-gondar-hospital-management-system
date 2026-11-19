/** Adds `days` to an ISO date string (YYYY-MM-DD) preserving UTC calendar dates. */
export function addLocalDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/** Computes the UTC day-of-week index (0 = Sunday ... 6 = Saturday) for an ISO date string. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Converts an ISO date string and HH:mm time to a Date object in East Africa Time (UTC+3). */
export function localDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+03:00`);
}

/** Converts an ISO date string to a start-of-day UTC Date object for queue indexing. */
export function toQueueDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}
