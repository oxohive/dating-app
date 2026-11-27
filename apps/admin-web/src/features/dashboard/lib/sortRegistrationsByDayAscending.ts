import { RegistrationsByDay } from "@/features/dashboard/api/dashboard.api";

/**
 * Pure state-update helper that orders registrations-by-day entries
 * oldest-first by `date`, so the chart/table reads left-to-right as a
 * timeline regardless of the order the backend returns rows in. Same
 * "don't assume backend order" spirit as `sortAuditLogNewestFirst`.
 */
export function sortRegistrationsByDayAscending(entries: RegistrationsByDay[]): RegistrationsByDay[] {
  return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
