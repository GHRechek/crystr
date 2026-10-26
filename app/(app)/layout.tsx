import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireMe, getPendingVouches, getTopSixNotices, hasAcceptedTerms } from "@/lib/data";
import { TERMS_VERSION } from "@/lib/terms";
import { readFlash } from "@/lib/flash";
import { Clock, SetupBanner, TabBar, Toast, WellButton } from "@/components/chrome";
import { DecayFrame } from "@/components/decay";
import { InfoMenu } from "@/components/info-menu";
import { ManaButton } from "@/components/mana";
import { VouchBanner } from "@/components/vouch-banner";
import { TopSixBanner } from "@/components/top-six-banner";
import { MANA_CAP, hasStarterHandle, manaColor, wellLine } from "@/lib/crystr";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, userId } = await requireMe();
  const [vouches, topSixFrom, agreed] = await Promise.all([
    getPendingVouches(userId),
    getTopSixNotices(userId),
    hasAcceptedTerms(userId, TERMS_VERSION),
  ]);
  if (!agreed) redirect("/terms");

  // Until they have registered, the welcome page, the wiki (to look up codes), the Well and
  // the face maker are all there is. A missing flag means a database from before it: let them in.
  const welcoming = profile.onboarded === false;
  if (welcoming) {
    const path = (await headers()).get("x-pathname") ?? "";
    const open = ["/welcome", "/wiki", "/well", "/me/avatar", "/info", "/bug"].some((p) => path === p || path.startsWith(`${p}/`));
    if (!open) redirect("/welcome");
  }
  const cap = welcoming ? 10 : MANA_CAP;
  const flash = await readFlash();
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
            <InfoMenu />
          </div>
          <div className="gauge">
            <i style={{ width: `${Math.max(2, (mana / cap) * 100)}%` }} />
          </div>
          <div className="head-foot">
            <span>{wellLine(mana)}</span>
            <WellButton low={mana < 11} />
          </div>
        </header>

        {hasStarterHandle(profile.handle) && !welcoming ? <SetupBanner /> : null}

        <VouchBanner vouches={vouches} />
        <TopSixBanner who={topSixFrom} />

        <main className="screen">
          <DecayFrame mana={mana}>{children}</DecayFrame>
        </main>

        {flash ? <Toast flash={flash} /> : null}

        <TabBar />
      </div>
    </div>
  );
}
