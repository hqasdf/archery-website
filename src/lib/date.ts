export { formatDateOnly, formatWeekRange } from "@arc-track/core/dates";

export function singaporeDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
