import Link from "next/link";
import { requireMe, getQuests } from "@/lib/data";
import { untilReady } from "@/lib/crystr";

export default async function WellPage() {
  const { userId } = await requireMe();
  const quests = await getQuests(userId);

  return (
    <div className="pad">
      <div>
        <div className="screen-title">THE WELL</div>
        <div className="screen-intro">
          It does not refill itself. Bring it proof you did something with your hands,
          your mouth, or your two minutes of silence.
        </div>
      </div>

      {quests.map((q) => {
        const waiting = !!q.ready_at;
        return (
          <Link key={q.slug} href={`/well/${q.slug}`} className="rowcard" style={{ padding: 13, minHeight: 64, gap: 12 }}>
            <div
              className="avatar"
              style={{ width: 36, height: 36, background: q.chip, fontSize: 13, opacity: waiting ? 0.5 : 1 }}
            >
              {q.glyph}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{q.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{q.sub}</div>
            </div>
            <div
              className="px"
              style={{
                fontSize: waiting ? 9 : 12,
                color: waiting ? "var(--dim)" : "var(--blu-soft)",
                flex: "none",
                textAlign: "right",
                lineHeight: 1.5,
              }}
            >
              {waiting ? `IN ${untilReady(q.ready_at!)}` : `+${q.reward}`}
            </div>
          </Link>
        );
      })}

      <div className="notice">
        Proof is reviewed by whoever is awake. Fabricate at your own risk; the well
        remembers.
      </div>
    </div>
  );
}
