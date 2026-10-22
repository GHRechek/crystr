import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe, getTopFriends, getBadges, getPlaintiffSince, getProfileByHandle } from "@/lib/data";
import { openThread } from "@/lib/actions";
import { Avatar } from "@/components/bits";
import { ago, corrupt, decayLevel } from "@/lib/crystr";

/** Someone else's profile: who they are, what they say about themselves, who they
 *  rank, what they've earned. Their mana, ledger and anything private stays theirs.
 *  Your own handle sends you to your own page, where you can change things. */
export default async function PersonPage(props: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await props.params;
  const { userId, profile: me } = await requireMe();

  let handle = "";
  try {
    handle = decodeURIComponent(raw).toLowerCase();
  } catch {
    notFound();
  }
  if (!/^[a-z0-9_.-]{1,40}$/.test(handle)) notFound();

  const person = await getProfileByHandle(handle);
  if (!person) notFound();
  if (person.id === userId) redirect("/me");

  const [top, badges, plaintiffSince] = await Promise.all([
    getTopFriends(person.id),
    getBadges(person.id),
    getPlaintiffSince(person.id),
  ]);
  const earned = badges.filter((b) => b.earned_at);
  const decay = decayLevel(me.mana);

  const days = Math.max(1, Math.round((Date.now() - new Date(person.created_at).getTime()) / 86_400_000));
  const details: [string, string][] = (
    [
      ["LIKES", person.likes],
      ["DISLIKES", person.dislikes],
      ["FAVOURITE FOOD", person.food],
      ["OBSESSED WITH", person.obsession],
    ] satisfies [string, string | null][]
  ).flatMap(([label, value]) => (value?.trim() ? [[label, value.trim()] as [string, string]] : []));

  return (
    <div style={{ paddingBottom: 24 }}>
      <div
        style={{
          height: 96,
          backgroundColor: "var(--inset)",
          backgroundImage: "repeating-linear-gradient(135deg,#2a2146 0 8px,#1b1d29 8px 16px)",
        }}
      />

      <div style={{ padding: "0 16px", marginTop: -40, position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ width: 88, height: 88, flex: "none" }}>
            <Avatar person={person} size={88} />
          </div>
          <div style={{ minWidth: 0, paddingBottom: 4 }}>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.01em", overflowWrap: "anywhere" }}>
              {person.handle}
            </div>
            <div className="px" style={{ fontSize: 8, color: "var(--muted)", marginTop: 4 }}>
              JOINED THE NEW WORLD · {days} {days === 1 ? "DAY" : "DAYS"}
            </div>
          </div>
        </div>

        {person.mood ? (
          <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-3)" }}>“{corrupt(person.mood, decay)}”</div>
        ) : null}

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" className="btn btn-sm" style={{ minHeight: 40 }}>
            ← BACK
          </Link>
          <form action={openThread} style={{ flex: 1 }}>
            <input type="hidden" name="other_id" value={person.id} />
            <button type="submit" className="btn btn-blue btn-block" style={{ minHeight: 40 }}>
              WHISPER
            </button>
          </form>
        </div>

        <div className="tile" style={{ padding: 12 }}>
          <div className="px" style={{ fontSize: 8.5, color: "var(--mag)", letterSpacing: ".07em", marginBottom: 7 }}>
            ABOUT
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)", textWrap: "pretty" }}>
            {corrupt(person.bio || "Nothing written here yet.", decay)}
          </div>
        </div>

        {details.length ? (
          <div className="tile" style={{ padding: 12 }}>
            <div className="px" style={{ fontSize: 8.5, color: "var(--blu-soft)", letterSpacing: ".07em", marginBottom: 8 }}>
              THE DETAILS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {details.map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div className="px" style={{ fontSize: 8, color: "var(--muted)", width: 92, flex: "none" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)", minWidth: 0 }}>
                    {corrupt(value, decay)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {top.length ? (
          <div>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)", marginBottom: 8 }}>
              TOP 6
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {top.map((f) => (
                <Link
                  key={f.id}
                  href={`/u/${f.handle}`}
                  style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", color: "inherit", textDecoration: "none" }}
                >
                  <Avatar person={f} size={72} fill />
                  <div style={{ fontSize: 9.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {f.handle}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {plaintiffSince ? (
          <div className="tile" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div className="px" style={{ fontSize: 9, color: "var(--blu-soft)" }}>
              ✓ REGISTERED PLAINTIFF
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
              SINCE {ago(plaintiffSince).toUpperCase()}
            </div>
          </div>
        ) : null}

        {earned.length ? (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
                BADGES
              </div>
              <span className="spacer" />
              <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
                {earned.length} OF {badges.length}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {earned.map((b) => (
                <div key={b.slug} className="tile" style={{ padding: 10, display: "flex", gap: 9, alignItems: "flex-start" }}>
                  {b.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/badges/${b.art}`} alt="" width={42} height={42} style={{ flex: "none", imageRendering: "pixelated" }} />
                  ) : (
                    <div
                      aria-hidden
                      style={{ width: 42, height: 42, flex: "none", display: "grid", placeItems: "center", fontSize: 16, color: "var(--mag-soft)", border: "1px solid var(--mag-edge)", borderRadius: 6 }}
                    >
                      ✦
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="px" style={{ fontSize: 8.5, color: "var(--text)", lineHeight: 1.5 }}>
                      {b.title.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.4, color: "var(--muted)", marginTop: 3 }}>{b.how}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
