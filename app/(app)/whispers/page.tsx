import Link from "next/link";
import { requireMe, getThreads } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { ago, COSTS } from "@/lib/crystr";

export default async function WhispersPage() {
  const { userId } = await requireMe();
  const threads = await getThreads(userId);

  return (
    <div className="pad" style={{ padding: "14px 16px 24px", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <div className="screen-title" style={{ marginBottom: 0 }}>
          WHISPERS
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {COSTS.whisper} mana to send. Silence is free.
        </div>
      </div>

      {threads.map((t) => (
        <Link key={t.id} href={`/whispers/${t.id}`} className="rowcard">
          <Avatar person={t.other} />
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.other.handle}</span>
              <span className="px" style={{ fontSize: 8, color: "var(--dim)" }}>
                {ago(t.last_message_at)}
              </span>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t.preview}
            </div>
          </div>
          {t.unread ? (
            <div style={{ width: 8, height: 8, flex: "none", background: "var(--mag)" }} />
          ) : null}
        </Link>
      ))}

      {threads.length === 0 ? (
        <div className="empty">
          NO ONE HAS WHISPERED
          <br />
          <span style={{ color: "var(--muted)" }}>SILENCE IS FREE, BUT IT IS STILL SILENCE.</span>
        </div>
      ) : null}

      <Link href="/whispers/new" className="btn btn-block" style={{ marginTop: 4 }}>
        ＋ WHISPER SOMEONE
      </Link>
    </div>
  );
}
