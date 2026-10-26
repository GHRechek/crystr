import { MONTHS, YEAR_MAX, YEAR_MIN, splitBirthday } from "@/lib/birthday";

const YEARS = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Day, month and year, each its own list; the year runs from 2026 back to 1026. The
 *  three fields are birth_day, birth_month and birth_year, put together on the server. */
export function BirthdayPicker({
  value,
  required,
  label = "YOUR BIRTHDAY",
  hint,
}: {
  value?: string | null;
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  const v = splitBirthday(value);
  const select = { flex: 1, minWidth: 0 } as const;
  return (
    <div className="field">
      <label htmlFor="birth_day">
        {label}
        {required ? " *" : ""}
      </label>
      {hint ? <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>{hint}</div> : null}
      <div style={{ display: "flex", gap: 8 }}>
        <select id="birth_day" name="birth_day" className="input" style={select} required={required} defaultValue={v.day} aria-label="Day">
          <option value="" disabled>
            Day
          </option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select name="birth_month" className="input" style={{ ...select, flex: 1.6 }} required={required} defaultValue={v.month} aria-label="Month">
          <option value="" disabled>
            Month
          </option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select name="birth_year" className="input" style={select} required={required} defaultValue={v.year} aria-label="Year">
          <option value="" disabled>
            Year
          </option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
