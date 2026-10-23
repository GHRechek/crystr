import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMe, getOpenBugs } from "@/lib/data";
import { resolveBug } from "@/lib/actions";
import { ago } from "@/lib/crystr";

/** The bugs people have reported, waiting for a witch. */
export default async function BugsPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");
  const bugs = await getOpenBugs();

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <span className="px" style={{ fontSize: 11, color: "var(--text-3)" }}>
          {bugs.length} WAITING
        </span>
      </div>

      <div>
        <h1 className="screen-title">BUGS</h1>
        <div className="screen-intro">
          What people have said is broken, with the page they were on and their browser. Mark one fixed
          when it is, or closed if there is nothing to fix.
        </div>
      </div>

      {bugs.length === 0 ? (
        <div className="empty">
          NOTHING WAITING
          <br />
          <span style={{ color: "var(--muted)" }}>EVERYTHING REPORTED HAS BEEN LOOKED AT.</span>
        </div>
      ) : null}

      {bugs.map((b) => (
        <form key={b.id} action={resolveBug} className="card" style={{ gap: 9 }}>
          <input type="hidden" name="id" value={b.id} />
          <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.8 }}>
            {(b.reporter?.handle ?? "someone who has left").toUpperCase()} · {ago(b.created_at).toUpperCase()}
            {b.page ? (
              <>
                <br />
                ON {b.page}
              </>
            ) : null}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{b.body}</div>
          {b.device ? (
            <div style={{ fontSize: 11.5, color: "var(--muted)", overflowWrap: "anywhere" }}>{b.device}</div>
          ) : null}
          <input name="note" aria-label="A note for the record" className="input" maxLength={500} placeholder="A note for the record (optional)" style={{ fontSize: 12.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" name="act" value="fixed" className="btn btn-sm btn-purple" style={{ flex: 1 }}>
              FIXED
            </button>
            <button type="submit" name="act" value="closed" className="btn btn-sm" style={{ flex: 1 }}>
              CLOSE
            </button>
          </div>
        </form>
      ))}
    </div>
  );
}
