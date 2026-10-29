import Link from "next/link";
import {
  requireMe,
  getLedger,
  getTopFriends,
  getBadges,
  getBadgeItems,
  getToken,
  countHelps,
  getPendingTrades,
  getPlaintiffSince,
  countOpenReports,
  countOpenBugs,
  getOverride,
} from "@/lib/data";
import { ROMAN, tokenReadyAt } from "@/lib/badges";
import { Avatar } from "@/components/bits";
import { BadgeArt, ItemTile, TokenImage } from "@/components/badges";
import { ProfileHead } from "./face-menu";
import { bannerOf, bannerStyle } from "@/lib/banner";
import { portraitFromId, normalizePortrait, packPortrait } from "@/lib/portrait/core";
import { ago, corrupt, decayLevel, BADGE_MANA, BASE_CAP, HELPS_PER_BADGE, TOKEN_GIFT_MONTHS } from "@/lib/crystr";
import { formatBirthday } from "@/lib/birthday";
import { tokenTitle } from "@/lib/token";

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function ProfilePage() {
  const { userId, profile } = await requireMe();
  const [ledger, top, badges, items, token, helps, trades, plaintiffSince, override] = await Promise.all([
    getLedger(userId),
    getTopFriends(userId),
    getBadges(userId),
    getBadgeItems(userId),
    getToken(userId),
    countHelps(userId),
    getPendingTrades(userId),
    getPlaintiffSince(userId),
    getOverride(userId),
  ]);
  const [openReports, openBugs] = profile.is_witch ? await Promise.all([countOpenReports(), countOpenBugs()]) : [0, 0];
  const earnedCount = badges.filter((b) => b.earned_at).length;
  const tradable = items.filter((i) => i.kind === "tradable");
  const tokens = items.filter((i) => i.kind === "token");
  const cap = profile.mana_cap ?? BASE_CAP;
  const fromBadges = earnedCount * BADGE_MANA.achievement + tradable.length * BADGE_MANA.tradable + tokens.length * BADGE_MANA.token;
  const tokenReady = tokenReadyAt(token?.last_given_at);
  const waiting = trades.incoming.length;

  const days = Math.max(
    1,
    Math.round((Date.now() - new Date(profile.created_at).getTime()) / 86_400_000),
  );
  const faceSrc = `/face/${packPortrait(
    profile.avatar_config ? normalizePortrait(profile.avatar_config) : portraitFromId(userId),
  )}.png`;
  const details: [string, string][] = (
    [
      ["BIRTHDAY", formatBirthday(profile.birthday)],
      ["LIKES", profile.likes],
      ["DISLIKES", profile.dislikes],
      ["FAVOURITE FOOD", profile.food],
      ["OBSESSED WITH", profile.obsession],
    ] satisfies [string, string | null | undefined][]
  ).flatMap(([label, value]) => (value?.trim() ? [[label, value.trim()] as [string, string]] : []));

  const decay = decayLevel(profile.mana);
  const slots = [...top, ...Array(Math.max(0, 6 - top.length)).fill(null)].slice(0, 6);

  const heading = (text: string, colour: string, aside?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
      <div className="px" style={{ fontSize: 12, color: colour }}>
        {text}
      </div>
      <span className="spacer" />
      {aside}
    </div>
  );

  return (
    <div style={{ paddingBottom: 24 }}>
      <ProfileHead
        src={faceSrc}
        handle={profile.handle}
        joined={`JOINED THE NEW WORLD · ${days} ${days === 1 ? "DAY" : "DAYS"}`}
        mood={profile.mood}
        banner={bannerStyle(bannerOf(profile))}
      />

      <div
        style={{
          padding: "12px 16px 0",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="tile" style={{ padding: 12 }}>
          <div
            className="px"
            style={{ fontSize: 11, color: "var(--mag)", letterSpacing: ".07em", marginBottom: 7 }}
          >
            ABOUT ME
          </div>
          <div
            style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-3)", textWrap: "pretty" }}
          >
            {corrupt(profile.bio || "Nothing written here yet. The City will assume the worst.", decay)}
          </div>
        </div>

        {details.length ? (
          <div className="tile" style={{ padding: 12 }}>
            <div
              className="px"
              style={{ fontSize: 11, color: "var(--blu-soft)", letterSpacing: ".07em", marginBottom: 8 }}
            >
              THE DETAILS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {details.map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <div
                    className="px"
                    style={{ fontSize: 11, color: "var(--muted)", width: 120, flex: "none" }}
                  >
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

        <div>
          {heading(
            "TOP 6",
            "var(--blu-soft)",
            <Link href="/me/top-six" className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
              {top.length ? "CHANGE →" : "PICK SOMEONE →"}
            </Link>,
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {slots.map((f, i) => (
              <Link
                key={f?.id ?? `empty-${i}`}
                // A vacant slot asks for a person: the Top 6 page, not the profile editor.
                href={f ? `/u/${f.handle}` : "/me/top-six"}
                style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", color: "inherit", textDecoration: "none" }}
              >
                {f ? (
                  <div style={{ width: "60%" }}>
                    <Avatar person={f} size={72} fill />
                  </div>
                ) : (
                  <div
                    className="avatar"
                    style={{ width: "60%", height: "auto", aspectRatio: "1", fontSize: 14, background: "var(--edge)" }}
                  >
                    ?
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {f ? f.handle : "add someone"}
                </div>
              </Link>
            ))}
          </div>
        </div>

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
        ) : override ? (
          <div className="tile" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--mag-soft)" }}>
              ✗ OFF THE BOOKS
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
              LET IN BY {(override.witch?.handle ?? "A WITCH").toUpperCase()} · {ago(override.at).toUpperCase()}
            </div>
          </div>
        ) : null}

        <div className="tile" style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
              MAX MANA · {cap}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 4 }}>
              {BASE_CAP} to start, {fromBadges} from badges. An achievement is worth {BADGE_MANA.achievement}, a tradable badge{" "}
              {BADGE_MANA.tradable}, a token {BADGE_MANA.token}.
            </div>
          </div>
          <span className="spacer" />
          <Link href="/me/trades" className="btn btn-sm" style={{ minHeight: 40, flex: "none" }}>
            TRADES{waiting ? ` · ${waiting}` : ""}
          </Link>
        </div>

        {badges.length ? (
          <div>
            {heading(
              "BADGES",
              "var(--mag-soft)",
              <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                {earnedCount} OF {badges.length}
              </div>,
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {badges.map((b) => {
                const got = !!b.earned_at;
                return (
                  <div
                    key={b.slug}
                    className="tile"
                    style={{ padding: 10, display: "flex", gap: 9, alignItems: "flex-start", opacity: got ? 1 : 0.5 }}
                  >
                    <BadgeArt b={b} got={got} tier={b.tier} progress={b.slug === "a-helping-hand" ? helps % HELPS_PER_BADGE : undefined} />
                    <div style={{ minWidth: 0 }}>
                      <div className="px" style={{ fontSize: 11, color: got ? "var(--text)" : "var(--muted)", lineHeight: 1.5 }}>
                        {b.title}
                        {got && b.tiers > 1 ? ` ${ROMAN[b.tier]}` : ""}
                      </div>
                      <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>
                        {b.slug === "a-helping-hand"
                          ? `${got ? b.blurb : b.how} Every ${HELPS_PER_BADGE} helps earn a tradable badge: ${helps % HELPS_PER_BADGE} of ${HELPS_PER_BADGE} towards the next.`
                          : got
                            ? b.blurb
                            : b.how}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          {heading(
            "TRADABLE BADGES",
            "var(--mag-soft)",
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              {tradable.length} · +{BADGE_MANA.tradable} EACH
            </div>,
          )}
          {tradable.length === 0 ? (
            <div className="notice">
              None yet. Help someone from the City with a problem and have them say yes, {HELPS_PER_BADGE} times, and
              one is drawn for you. They can be traded from anybody&apos;s page, badge for badge or badge for nothing.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {tradable.map((it) => (
                <ItemTile key={it.id} item={it} />
              ))}
            </div>
          )}
        </div>

        <div>
          {heading("YOUR TOKEN", "var(--pur-soft)")}
          <div className="tile" style={{ padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
            {token ? (
              <TokenImage design={token.design} size={96} />
            ) : (
              <div
                aria-hidden
                style={{ width: 96, height: 96, flex: "none", display: "grid", placeItems: "center", color: "var(--dim)", border: "1px dashed var(--edge)", borderRadius: "var(--px-r)" }}
              >
                ?
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="px" style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.5 }}>
                {tokenTitle(profile.display_name, profile.handle).toUpperCase()}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "var(--muted)", marginTop: 3 }}>
                {!token
                  ? `A badge of your own making. Give it and they hold ${BADGE_MANA.token} more max mana. Once every ${TOKEN_GIFT_MONTHS} months.`
                  : tokenReady
                    ? `Given. You can give it again on ${longDate(tokenReady)}.`
                    : `Ready to give, from somebody's page. Worth ${BADGE_MANA.token} max mana to whoever holds it.`}
              </div>
              <Link href="/me/token" className="btn btn-sm" style={{ minHeight: 40, marginTop: 8, display: "inline-flex" }}>
                {token ? "CHANGE OR GIVE IT" : "MAKE YOUR TOKEN"}
              </Link>
            </div>
          </div>
        </div>

        {tokens.length ? (
          <div>
            {heading(
              "TOKENS GIVEN TO YOU",
              "var(--pur-soft)",
              <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                {tokens.length} · +{BADGE_MANA.token} EACH
              </div>,
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {tokens.map((it) => (
                <ItemTile key={it.id} item={it} />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <div
            style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}
          >
            <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>
              LEDGER
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
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
                    fontSize: 12,
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
                <div className="px" style={{ fontSize: 11, color: "var(--dim)", flex: "none" }}>
                  {ago(l.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {profile.is_witch ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/reports" className="btn btn-sm" style={{ minHeight: 40 }}>
              REPORTS · {openReports}
            </Link>
            <Link href="/bugs" className="btn btn-sm" style={{ minHeight: 40 }}>
              BUGS · {openBugs}
            </Link>
            <Link href="/me/plaintiff" className="btn btn-sm" style={{ minHeight: 40 }}>
              THE BOOKS
            </Link>
            <Link href="/me/override" className="btn btn-sm" style={{ minHeight: 40 }}>
              THE OVERRIDE
            </Link>
          </div>
        ) : null}

        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-block" style={{ marginTop: 4 }}>
            LEAVE THE CITY
          </button>
        </form>
      </div>
    </div>
  );
}
