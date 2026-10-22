import { submitReport } from "@/lib/actions";
import { REPORT_REASONS } from "@/lib/terms";

/** A small "report" under a post or at the top of a whisper thread. Opens in place;
 *  the person picks what kind of thing it is and may add a note. Witches read it. */
export function ReportButton({
  kind,
  target,
  back,
  label = "REPORT",
}: {
  kind: "post" | "whisper";
  target: number;
  /** Where to land after sending. */
  back: string;
  label?: string;
}) {
  return (
    <details className="report">
      <summary className="px" style={{ fontSize: 8, color: "var(--dim)", cursor: "pointer", listStyle: "none" }}>
        {label}
      </summary>
      <form
        action={submitReport}
        style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, minWidth: 220 }}
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="target" value={target} />
        <input type="hidden" name="back" value={back} />
        <select name="reason" className="input" defaultValue="harassment" aria-label="What is this about">
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          name="note"
          className="input"
          maxLength={500}
          placeholder="Anything we should know (optional)"
          style={{ fontSize: 12 }}
        />
        <button type="submit" className="btn btn-sm" style={{ minHeight: 34 }}>
          SEND TO THE WITCHES
        </button>
      </form>
    </details>
  );
}
