import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, getPendingVouches, getTopSixNotices, getTradeNotices, hasAcceptedTerms, claimBirthdayBadge } from "@/lib/data";
import { birthdayBadgeDue } from "@/lib/birthday";
import { EDGE } from "@/lib/toast";
import { TERMS_VERSION } from "@/lib/terms";
import { readFlash } from "@/lib/flash";
import { Clock, SetupBanner, TabBar, Toast, WellButton } from "@/components/chrome";
import { DecayFrame } from "@/components/decay";
import { InfoMenu } from "@/components/info-menu";
import { ManaButton } from "@/components/mana";
import { VouchBanner } from "@/components/vouch-banner";
import { TopSixBanner } from "@/components/top-six-banner";
import { TradeBanner } from "@/components/trade-banner";
import { BADGE_MANA, BASE_CAP, WELCOME_CAP, hasStarterHandle, manaColor, wellLine } from "@/lib/crystr";
import { BREACH_COOKIE } from "@/lib/breach";

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
  if (welcoming) {
    const path = (await headers()).get("x-pathname") ?? "";
    const open = ["/welcome", "/wiki", "/me/avatar", "/breach"].some((p) => path === p || path.startsWith(`${p}/`));
    if (!open) {
      const key = (await cookies()).get(BREACH_COOKIE)?.value;
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
      ? { k: "HAPPY BIRTHDAY", t: `The City gives you a badge for the day: ${gift.title}. Yours to keep or trade.`, e: EDGE.mag }
      : null);
  const mana = profile.mana;

  return (
    <div className="stage">
      <div className="frame">
        <div className="statusbar">
          <Clock />
          <span className="where">THE CITY · LOW MARKET</span>
          <span aria-hidden>▓▓▓░</span>
        </div>

        <header className="head">
          <div className="head-row">
            <div className="wordmark">CRYSTR</div>
            <div className="spacer" />
            <ManaButton />
            <div className="mana-count" style={{ color: manaColor(mana) }}>
              {String(mana).padStart(2, "0")}/{cap}
            </div>
            {welcoming ? null : <InfoMenu />}
          </div>
          <div className="gauge">
            <i style={{ width: `${Math.max(2, (mana / cap) * 100)}%` }} />
          </div>
          <div className="head-foot">
            <span>{welcoming ? "Register to enter the City." : wellLine(mana)}</span>
            {welcoming ? null : <WellButton low={mana < 11} />}
          </div>
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

        <TabBar welcoming={welcoming} />
      </div>
    </div>
  );
}
