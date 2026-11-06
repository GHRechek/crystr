import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  requireMe,
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
import { ROMAN, tokenReadyAt, resolveShown, resolveWorking, finishedWorking, goalGrid, questGrid, achievementGrid } from "@/lib/badges";
import { Avatar } from "@/components/bits";
import { BadgeArt, ItemTile, TokenImage } from "@/components/badges";
import { AboutBadges } from "@/components/about-badges";
import { WorkingOn } from "@/components/working-on";
import { Quests } from "@/components/quests";
import { ProfileHead } from "./face-menu";
import { bannerOf, bannerStyle } from "@/lib/banner";
import { portraitFromId, normalizePortrait, packPortrait } from "@/lib/portrait/core";
import { ago, corrupt, decayLevel, BADGE_MANA, BASE_CAP, HELPS_PER_BADGE, TOKEN_GIFT_MONTHS } from "@/lib/crystr";
import { formatBirthday } from "@/lib/birthday";
import { tokenTitle } from "@/lib/token";

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });


export default async function ProfilePage(props: { searchParams: Promise<{ quests?: string; goals?: string }> }) {
  const sp = await props.searchParams;
  const quests = sp.quests === "1";
  const goals = sp.goals === "1";
  const { userId, profile } = await requireMe();
  // Count anything that has come due since you were last here (a day more in the City, a Top 5).
  await createClient().rpc("cr_check_badges");
  const { data: progressData } = await createClient().rpc("cr_goal_progress");
  const progress = (progressData ?? {}) as Record<string, number>;
  const [top, badges, items, token, helps, trades, plaintiffSince, override] = await Promise.all([
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

  const shown = resolveShown(profile.shown_badges, badges, items, profile.handle);
  const decay = decayLevel(profile.mana);
  const slots = [...top, ...Array(Math.max(0, 5 - top.length)).fill(null)].slice(0, 5);

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
          <div>
            <div
              className="px"
              style={{ fontSize: 11, color: "var(--blu-soft)", letterSpacing: ".07em", marginBottom: 8 }}
            >
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

        <div>
          {heading(
            "TOP 5",
            "var(--blu-soft)",
            <Link href="/me/top-six" className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
              {top.length ? "CHANGE →" : "PICK SOMEONE →"}
            </Link>,
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
            {slots.map((f, i) => (
              <Link
                key={f?.id ?? `empty-${i}`}
                // A vacant slot asks for a person: the Top 6 page, not the profile editor.
                href={f ? `/u/${f.handle}` : "/me/top-six"}
                style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center", color: "inherit", textDecoration: "none" }}
              >
                {f ? (
                  <div style={{ width: "100%" }}>
                    <Avatar person={f} size={72} fill />
                  </div>
                ) : (
                  <div
                    className="avatar"
                    style={{ width: "100%", height: "auto", aspectRatio: "1", fontSize: 14, background: "var(--edge)" }}
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

        {/* Quests: the token, up to four badges you show, and the list of every quest. */}
        <Quests
          key={quests ? "open" : "shut"}
          openAtStart={quests}
          items={questGrid(badges)}
          viewer={{
            earned: achievementGrid(badges.filter((b) => b.earned_at)),
            tradable: resolveShown(tradable.map((i) => `i:${i.id}`), badges, items, profile.handle, 10000),
            current: shown.map((b) => b.key),
            aside: (
              <Link href="/me/trades" className="px" style={{ fontSize: 11, color: "var(--pur-pale)", whiteSpace: "nowrap" }}>
                TRADES{waiting ? ` · ${waiting}` : ""} →
              </Link>
            ),
          }}
        >
          <AboutBadges noPen earned={[]} tradable={[]} shown={shown}>
            <Link
              href="/me/token"
              aria-label="Your token"
              style={{ width: 64, height: 64, flex: "none", display: "grid", placeItems: "center", color: "var(--dim)", border: token ? 0 : "1px dashed var(--edge)", borderRadius: "var(--px-r)", textDecoration: "none", lineHeight: 0 }}
            >
              {token ? <TokenImage design={token.design} size={64} /> : <span className="px" style={{ fontSize: 16 }}>?</span>}
            </Link>
          </AboutBadges>
        </Quests>

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

        {/* The badges you have, just the pictures, packed tight; tap one for its tooltip. */}
        {/* What you are going after, as a list, with a button to see every badge and choose. */}
        <WorkingOn key={goals ? "pick" : "view"} openAtStart={goals} isWitch={profile.is_witch} editable finished={finishedWorking(profile.working_on, badges)} items={resolveWorking(profile.working_on, badges, [], progress)} all={goalGrid(badges, progress)} />

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
