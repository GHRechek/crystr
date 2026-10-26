import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireMe, getTopFriends, getBadges, getBadgeItems, getToken, getPlaintiffSince, getProfileByHandle } from "@/lib/data";
import { openThread } from "@/lib/actions";
import { Avatar } from "@/components/bits";
import { BadgeArt, ItemTile, TokenImage } from "@/components/badges";
import { ago, corrupt, decayLevel, BADGE_MANA } from "@/lib/crystr";
import { bannerOf, bannerStyle } from "@/lib/banner";
import { tokenTitle } from "@/lib/token";

/** Someone else's profile: who they are, what they say about themselves, who they
 *  rank, what they've earned and what they hold that could be traded. Their mana,
 *  ledger and anything private stays theirs. Your own handle sends you to your own
 *  page, where you can change things. */
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

  const [top, badges, items, token, plaintiffSince] = await Promise.all([
    getTopFriends(person.id),
    getBadges(person.id),
    getBadgeItems(person.id),
    getToken(person.id),
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
      <div style={{ height: 96, ...bannerStyle(bannerOf(person)) }} />

      <div style={{ padding: "0 16px", marginTop: -40, position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          <div style={{ width: 88, height: 88, flex: "none" }}>
            <Avatar person={person} size={88} />
          </div>
          <div style={{ minWidth: 0, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.01em", overflowWrap: "anywhere" }}>
              {person.handle}
            </h1>
            <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
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
          <Link href={`/u/${person.handle}/trade`} className="btn btn-purple" style={{ minHeight: 40, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            TRADE BADGES
          </Link>
        </div>

        <div className="tile" style={{ padding: 12 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--mag)", letterSpacing: ".07em", marginBottom: 7 }}>
            ABOUT
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)", textWrap: "pretty" }}>
            {corrupt(person.bio || "Nothing written here yet.", decay)}
          </div>
        </div>

        {details.length ? (
          <div className="tile" style={{ padding: 12 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)", letterSpacing: ".07em", marginBottom: 8 }}>
              THE DETAILS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {details.map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div className="px" style={{ fontSize: 11, color: "var(--muted)", width: 120, flex: "none" }}>
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
            <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)", marginBottom: 8 }}>
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
                  <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                    {f.handle}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {plaintiffSince ? (
          <div className="tile" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
              ✓ REGISTERED PLAINTIFF
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              SINCE {ago(plaintiffSince).toUpperCase()}
            </div>
          </div>
        ) : null}

        {token ? (
          <div className="tile" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            <TokenImage design={token.design} size={64} />
            <div style={{ minWidth: 0 }}>
              <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                {tokenTitle(person.display_name, person.handle).toUpperCase()}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>
                Their own token. Worth {BADGE_MANA.token} max mana to whoever they give it to.
              </div>
            </div>
          </div>
        ) : null}

        {earned.length ? (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div className="px" style={{ fontSize: 12, color: "var(--mag-soft)" }}>
                BADGES
              </div>
              <span className="spacer" />
              <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                {earned.length} OF {badges.length}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {earned.map((b) => (
                <div key={b.slug} className="tile" style={{ padding: 10, display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <BadgeArt b={b} got />
                  <div style={{ minWidth: 0 }}>
                    <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                      {b.title.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, lineHeight: 1.4, color: "var(--muted)", marginTop: 3 }}>{b.how}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {items.length ? (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
                WHAT THEY HOLD
              </div>
              <span className="spacer" />
              <Link href={`/u/${person.handle}/trade`} className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
                OFFER A TRADE →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {items.map((it) => (
                <ItemTile key={it.id} item={it} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
