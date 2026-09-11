import Link from "next/link";
import { requireMe, getLedger, getTopFriends } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { ago, avatarBg, COSTS } from "@/lib/crystr";

export default async function ProfilePage() {
  const { userId, profile } = await requireMe();
  const [ledger, top] = await Promise.all([getLedger(userId), getTopFriends(userId)]);

  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000),
  );
  const slots = [...top, ...Array(Math.max(0, 8 - top.length)).fill(null)].slice(0, 8);

  return (
    <div style={{ paddingBottom: 24 }}>
      <div
        style={{
          height: 112,
          backgroundColor: "var(--inset)",
          backgroundImage: "repeating-linear-gradient(135deg,#2a2146 0 8px,#1b1d29 8px 16px)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
          BANNER — DROP A 390×112 TILE
        </span>
      </div>

      <div
        style={{
          padding: "0 16px",
          marginTop: -26,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
          <Link
            href="/me/avatar"
            title="Change your face"
            style={{ boxShadow: "0 0 0 3px var(--device)", borderRadius: "var(--px-r)", lineHeight: 0 }}
          >
            <Avatar person={profile} you size={64} />
          </Link>
          <div style={{ paddingBottom: 4, minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-.02em" }}>
              {profile.handle}
            </div>
            <div className="px" style={{ fontSize: 8.5, color: "var(--muted)" }}>
              JOINED THE NEW WORLD · {days} {days === 1 ? "DAY" : "DAYS"}
            </div>
          </div>
          <Link href="/me/edit" className="btn btn-sm" style={{ marginBottom: 4 }}>
            EDIT
          </Link>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div className="tile" style={{ flex: 1 }}>
            <div className="flabel" style={{ marginBottom: 4 }}>
              MOOD
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              {profile.mood || "unstated, which is its own mood"}
            </div>
          </div>
          <div className="tile" style={{ flex: "none", width: 104 }}>
            <div className="flabel" style={{ marginBottom: 4 }}>
              SPENT TOTAL
            </div>
            <div className="px" style={{ fontSize: 14, color: "var(--pur-soft)" }}>
              {profile.spent_total}
            </div>
          </div>
        </div>

        <div className="tile" style={{ padding: 12 }}>
          <div
            className="px"
            style={{ fontSize: 8.5, color: "var(--mag)", letterSpacing: ".07em", marginBottom: 7 }}
          >
            ABOUT ME
          </div>
          <div
            style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)", textWrap: "pretty" }}
          >
            {profile.bio || "Nothing written here yet. The City will assume the worst."}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
              TOP 8
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
              reordering one costs {COSTS.topEight} mana and a friendship
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {slots.map((f, i) => (
              <div
                key={f?.id ?? `empty-${i}`}
                style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}
              >
                <div
                  className="avatar"
                  style={{
                    width: "100%",
                    height: "auto",
                    aspectRatio: "1",
                    fontSize: 14,
                    background: f ? avatarBg(f.id) : "var(--edge)",
                  }}
                >
                  {f ? f.handle[0]?.toUpperCase() : "?"}
                </div>
                <div
                  style={{
                    fontSize: 9.5,
                    color: "var(--muted)",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {f ? f.handle : "vacant"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-soft)", marginBottom: 8 }}>
            LEDGER
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ledger.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 2px",
                  borderBottom: "1px solid var(--rule-soft)",
                }}
              >
                <div
                  className="px"
                  style={{
                    fontSize: 11,
                    width: 40,
                    flex: "none",
                    color: l.amount > 0 ? "var(--blu-soft)" : "var(--mag-soft)",
                  }}
                >
                  {l.amount > 0 ? `+${l.amount}` : l.amount}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 12,
                    color: "var(--text-2)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {l.reason}
                </div>
                <div className="px" style={{ fontSize: 8, color: "var(--dim)", flex: "none" }}>
                  {ago(l.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-block" style={{ marginTop: 4 }}>
            LEAVE THE CITY
          </button>
        </form>
      </div>
    </div>
  );
}
