import Link from "next/link";
import { requireMe, getThreads } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { ago, corrupt, COSTS, decayLevel } from "@/lib/crystr";

export default async function WhispersPage() {
  const { userId, profile } = await requireMe();
  const threads = await getThreads(userId);
  const decay = decayLevel(profile.mana);

  return (
    <div className="pad" style={{ padding: "14px 16px 24px", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <h1 className="screen-title" style={{ marginBottom: 0 }}>
          WHISPERS
        </h1>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          A whisper takes {COSTS.whisper} mana. Silence is free.
        </div>
      </div>

      {threads.map((t) => (
        <div key={t.id} className="rowcard" style={{ padding: 0, gap: 0, cursor: "default" }}>
          {/* The face goes to their profile; the rest of the row opens the conversation. */}
          <Link
            href={`/u/${t.other.handle}`}
            aria-label={`${t.other.handle}'s profile`}
            style={{ display: "flex", padding: "11px 0 11px 11px", flex: "none" }}
          >
            <Avatar person={t.other} />
          </Link>
          <Link
            href={`/whispers/${t.id}`}
            style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 11, padding: 11, color: "inherit", textDecoration: "none", alignSelf: "stretch" }}
          >
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.other.handle}</span>
              <span className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
                {ago(t.last_message_at)}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {corrupt(t.preview, decay)}
            </div>
          </div>
          {t.unread ? (
            <div style={{ width: 8, height: 8, flex: "none", background: "var(--mag)" }} />
          ) : null}
          </Link>
        </div>
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
