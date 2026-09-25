const shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function formatDateOnly(value: string, includeYear = true) {
  const { day, month, year } = dateParts(value);
  const formatted = `${day} ${shortMonthNames[month - 1]}`;
  return includeYear ? `${formatted} ${year}` : formatted;
}

export function formatWeekRange(startDate: string, endDate: string) {
  const start = dateParts(startDate);
  const end = dateParts(endDate);
  if (start.month === end.month && start.year === end.year) return `${start.day}–${end.day} ${shortMonthNames[end.month - 1]}`;
  return `${formatDateOnly(startDate, false)}–${formatDateOnly(endDate, false)}`;
}

export function singaporeDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
