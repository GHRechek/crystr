import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getOpenReports } from "@/lib/data";
import { resolveReport } from "@/lib/actions";
import { REPORT_REASON_LABEL } from "@/lib/terms";
import { ago } from "@/lib/crystr";

/** What the City has reported, waiting for a witch. */
export default async function ReportsPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");
  const reports = await getOpenReports();

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <span className="px" style={{ fontSize: 11, color: "var(--text-3)" }}>
          {reports.length} WAITING
        </span>
      </div>

      <div>
        <h1 className="screen-title">REPORTS</h1>
        <div className="screen-intro">
          Things members have asked us to look at. What was said is copied here, so it stays even
          if it is deleted. Talk to the people involved yourselves, then mark it dealt with.
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty">
          NOTHING WAITING
          <br />
          <span style={{ color: "var(--muted)" }}>EVERYTHING REPORTED HAS BEEN READ.</span>
        </div>
      ) : null}

      {reports.map((r) => (
        <form key={r.id} action={resolveReport} className="card" style={{ gap: 9 }}>
          <input type="hidden" name="id" value={r.id} />
          <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
            {(REPORT_REASON_LABEL[r.reason] ?? r.reason).toUpperCase()} ·{" "}
            {r.kind === "post" ? "A POST" : "A WHISPER CONVERSATION"} · {ago(r.created_at).toUpperCase()}
            <br />
            ABOUT {(r.about?.handle ?? "someone who has left").toUpperCase()} · REPORTED BY{" "}
            {(r.reporter?.handle ?? "someone who has left").toUpperCase()}
          </div>
          {r.note ? <div style={{ fontSize: 13, lineHeight: 1.5 }}>“{r.note}”</div> : null}
          {r.excerpt ? (
            <div
              style={{
                fontSize: 12.5,
                lineHeight: 1.55,
                color: "var(--text-2)",
                whiteSpace: "pre-wrap",
                padding: "8px 10px",
                background: "var(--surface)",
                boxShadow: "0 0 0 1px var(--edge)",
              }}
            >
              {r.excerpt}
            </div>
          ) : null}
          <input name="note" aria-label="A note for the record" className="input" maxLength={500} placeholder="A note for the record (optional)" style={{ fontSize: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" name="act" value="action" className="btn btn-sm btn-purple" style={{ flex: 1, minHeight: 40 }}>
              DEALT WITH
            </button>
            <button type="submit" name="act" value="dismiss" className="btn btn-sm" style={{ flex: 1, minHeight: 40 }}>
              NOT NEEDED
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
