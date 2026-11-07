import { Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, getPendingVouches, getTopSixNotices, getTradeNotices, hasAcceptedTerms, claimBirthdayBadge, getUnreadThreadIds } from "@/lib/data";
import { birthdayBadgeDue } from "@/lib/birthday";
import { EDGE } from "@/lib/toast";
import { TERMS_VERSION } from "@/lib/terms";
import { readFlash } from "@/lib/flash";
import { SetupBanner, TabBar, Toast } from "@/components/chrome";
import { DecayFrame } from "@/components/decay";
import { InfoMenu } from "@/components/info-menu";
import { SearchIcon } from "@/components/icons";
import { ManaButton } from "@/components/mana";
import { VouchBanner } from "@/components/vouch-banner";
import { TopSixBanner } from "@/components/top-six-banner";
import { TradeBanner } from "@/components/trade-banner";
import { EncounterHost } from "@/components/encounter";
import { BADGE_MANA, BASE_CAP, WELCOME_CAP, hasStarterHandle, manaColor } from "@/lib/crystr";
import { BREACH_COOKIE, SCAN_COOKIE } from "@/lib/breach";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await requireMe();
  const [vouches, topSixFrom, trades, agreed] = await Promise.all([
    getPendingVouches(userId),
    getTopSixNotices(userId),
    getTradeNotices(userId),
    hasAcceptedTerms(userId, TERMS_VERSION),
  ]);
  if (!agreed) redirect("/terms");

  // Until they have registered, the registry, the wiki (to look up codes), the face maker
  // (registering needs a face) and the breach (a witch's key, scanned) are all there is. A
  // scanned key waits in a cookie through the sign-in and the terms, so someone holding one
  // lands on the breach and not the form. A missing flag means a database from before it:
  // let them in.
  const welcoming = profile.onboarded === false;
  const hdrs = await headers();
  const here = hdrs.get("x-pathname") ?? "";
  // A form's redirect is drawn in the same response as the form, and the path the proxy saw is the
  // form's page (the terms, say), not where it sends you. Judging that path would send you on to
  // /welcome again and again, a blank screen; the action has already decided where you go.
  const fromAction = !!hdrs.get("next-action");
  // Whispers with something new, for the bubble on the tab. The one open right now is
  // being read, so it is not counted.
  const openWhisper = /^\/whispers\/(\d+)/.exec(here)?.[1];
  const unreadWhispers = welcoming ? 0 : (await getUnreadThreadIds()).filter((n) => String(n) !== openWhisper).length;
  if (welcoming) {
    const path = here;
    const open = ["/welcome", "/wiki", "/me/avatar", "/breach"].some((p) => path === p || path.startsWith(`${p}/`));
    if (!open && !fromAction) {
      const jar = await cookies();
      const key = jar.get(BREACH_COOKIE)?.value || jar.get(SCAN_COOKIE)?.value;
      redirect(key ? "/breach" : "/welcome");
    }
  }
  // A birthday badge, on the day or the first time they are here after it. The profile
  // already says whether one could be due, so most days this costs nothing; the database
  // decides for real. Given now, it is told now, and the ceiling shown counts it.
  const gift = !welcoming && birthdayBadgeDue(profile.birthday, profile.birthday_badge_year) ? await claimBirthdayBadge() : null;
  // Each person's own ceiling, from the database; a database from before badges carried mana
  // gets the flat numbers.
  const cap = (profile.mana_cap ?? (welcoming ? WELCOME_CAP : BASE_CAP)) + (gift ? BADGE_MANA.tradable : 0);
  const flash =
    (await readFlash()) ??
    (gift
      ? { k: "HAPPY BIRTHDAY", t: "The City gives you a Historikal draw for the day. Open it from the monster button beside your portrait: FIND ONE!", e: EDGE.mag }
      : null);
  const mana = profile.mana;

  return (
    <div className="stage">
      <div className="frame">
        <header className="head">
          <div className="head-row">
            {welcoming ? null : (
              <Link href="/people" aria-label="Search people" title="Search people" style={{ flex: "none", display: "grid", placeItems: "center", width: 28, height: 28, color: "var(--muted)" }}>
                <SearchIcon />
              </Link>
            )}
            <div className="wordmark">CRYSTR</div>
            {/* The meter fills the space between the name and the potion. */}
            <div
              className="gauge gauge-inline"
              role="meter"
              aria-label="Mana"
              aria-valuemin={0}
              aria-valuemax={cap}
              aria-valuenow={mana}
            >
              <i style={{ width: `${Math.max(2, (mana / cap) * 100)}%` }} />
            </div>
            <ManaButton mana={mana} cap={cap} closed={welcoming} />
            <div className="mana-count" style={{ color: manaColor(mana) }}>
              {String(mana).padStart(2, "0")}/{cap}
            </div>
            {welcoming ? null : (
              <Suspense fallback={null}>
                <InfoMenu isWitch={profile.is_witch} />
              </Suspense>
            )}
          </div>
          {welcoming ? (
            <div className="head-foot">
              <span>Register to enter the City.</span>
            </div>
          ) : null}
        </header>

        {hasStarterHandle(profile.handle) && !welcoming ? <SetupBanner /> : null}

        {welcoming ? null : (
          <>
            <VouchBanner vouches={vouches} />
            <TopSixBanner who={topSixFrom} />
            <TradeBanner who={trades} />
          </>
        )}

        <main className="screen">
          <DecayFrame mana={mana} card={!welcoming}>{children}</DecayFrame>
        </main>

        {flash ? <Toast flash={flash} /> : null}

        {/* Someone has scanned you to trade or battle: it opens here, on both phones. */}
        {welcoming ? null : <EncounterHost />}

        <TabBar welcoming={welcoming} unreadWhispers={unreadWhispers} />
      </div>
    </div>
  );
}
