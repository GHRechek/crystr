import { submitReport } from "@/lib/actions";
import { REPORT_REASONS } from "@/lib/terms";

/** A small "report" under a post or at the top of a whisper thread. Opens in place;
 *  the person picks what kind of thing it is and may add a note. Witches read it. */
type ReportProps = {
  kind: "post" | "whisper";
  target: number;
  /** Where to land after sending. */
  back: string;
};

/** The report form itself: what kind of thing it is, an optional note, send. */
export function ReportForm({ kind, target, back }: ReportProps) {
  return (
    <form action={submitReport} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220 }}>
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
        name="note" aria-label="Anything we should know"
        className="input"
        maxLength={500}
        placeholder="Anything we should know (optional)"
        style={{ fontSize: 12 }}
      />
      <button type="submit" className="btn btn-sm" style={{ minHeight: 40 }}>
        SEND TO THE WITCHES
      </button>
    </form>
  );
}

/** A "report" link that opens the form in place. Used on whisper conversations. */
export function ReportButton({ label = "REPORT", ...props }: ReportProps & { label?: string }) {
  return (
    <details className="report">
      <summary className="px" style={{ fontSize: 11, color: "var(--dim)", cursor: "pointer", listStyle: "none" }}>
        {label}
      </summary>
      <div style={{ marginTop: 8 }}>
        <ReportForm {...props} />
      </div>
    </details>
  );
}

/** The little menu at the top right of a post. For now it holds one thing: report. */
export function PostMenu(props: ReportProps) {
  return (
    <details className="post-menu">
      <summary aria-label="More options" className="btn btn-sm post-menu-btn">
        ☰
      </summary>
      <div className="post-menu-panel">
        <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
          REPORT THIS POST
        </div>
        <ReportForm {...props} />
      </div>
    </details>
  );
}
