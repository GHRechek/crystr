import Link from "next/link";
import { requireMe, getLedger, getTopFriends } from "@/lib/data";
import { Avatar } from "@/components/bits";
import { ProfileHead } from "./face-menu";
import { portraitFromId, normalizePortrait, packPortrait } from "@/lib/portrait/core";
import { ago, COSTS } from "@/lib/crystr";

export default async function ProfilePage() {
  const { userId, profile } = await requireMe();
  const [ledger, top] = await Promise.all([getLedger(userId), getTopFriends(userId)]);

  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000),
  );
  const faceSrc =
    profile.portrait_url ??
    `/face/${packPortrait(
      profile.avatar_config ? normalizePortrait(profile.avatar_config) : portraitFromId(userId),
    )}.png`;
  const details: [string, string][] = (
    [
      ["LIKES", profile.likes],
      ["DISLIKES", profile.dislikes],
      ["FAVOURITE FOOD", profile.food],
      ["OBSESSED WITH", profile.obsession],
    ] satisfies [string, string | null][]
  ).flatMap(([label, value]) => (value?.trim() ? [[label, value.trim()] as [string, string]] : []));

  const slots = [...top, ...Array(Math.max(0, 6 - top.length)).fill(null)].slice(0, 6);

  return (
    <div style={{ paddingBottom: 24 }}>
      <ProfileHead
        src={faceSrc}
        handle={profile.handle}
        joined={`JOINED THE NEW WORLD · ${days} ${days === 1 ? "DAY" : "DAYS"}`}
        mood={profile.mood}
      />

      <div
        style={{
          padding: "12px 16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >

        <Link href="/me/edit" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
          EDIT PROFILE
        </Link>

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

        {details.length ? (
          <div className="tile" style={{ padding: 12 }}>
            <div
              className="px"
              style={{ fontSize: 8.5, color: "var(--blu-soft)", letterSpacing: ".07em", marginBottom: 8 }}
            >
              THE DETAILS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {details.map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div
                    className="px"
                    style={{ fontSize: 8, color: "var(--muted)", width: 92, flex: "none" }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)", minWidth: 0 }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
              TOP 6
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
              reordering one costs {COSTS.topSix} mana and a friendship
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {slots.map((f, i) => (
              <div
                key={f?.id ?? `empty-${i}`}
                style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}
              >
                {f ? (
                  <Avatar person={f} size={72} fill />
                ) : (
                  <div
                    className="avatar"
                    style={{ width: "100%", aspectRatio: "1", fontSize: 14, background: "var(--edge)" }}
                  >
                    ?
                  </div>
                )}
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
          <div
            style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}
          >
            <div className="px" style={{ fontSize: 11, color: "var(--pur-soft)" }}>
              LEDGER
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
              SPENT TOTAL
            </div>
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
              {profile.spent_total}
            </div>
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
