// A birthday on the registry: a day, a month and a year between 1026 and 2026, kept as a
// date. Shared by the welcome page, the profile editor and the pages that print it.

export const YEAR_MIN = 1026;
export const YEAR_MAX = 2026;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function daysIn(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** "YYYY-MM-DD" for a real date in range, null for nothing chosen, "bad" for a date that
 *  is not one (the 31st of April, a year outside the range). */
export function composeBirthday(day: string, month: string, year: string): string | null | "bad" {
  if (!day && !month && !year) return null;
  const d = Number(day), m = Number(month), y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return "bad";
  if (y < YEAR_MIN || y > YEAR_MAX || m < 1 || m > 12 || d < 1 || d > daysIn(y, m)) return "bad";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function splitBirthday(iso: string | null | undefined): { day: string; month: string; year: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return { day: "", month: "", year: "" };
  return { day: String(Number(m[3])), month: String(Number(m[2])), year: String(Number(m[1])) };
}

/** "3 March 1026", as the City prints it. */
export function formatBirthday(iso: string | null | undefined): string {
  const { day, month, year } = splitBirthday(iso);
  if (!day) return "";
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`;
}
