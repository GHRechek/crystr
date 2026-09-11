import { requireMe } from "@/lib/data";
import { readFlash } from "@/lib/flash";
import { Clock, TabBar, Toast, WellButton } from "@/components/chrome";
import { MANA_CAP, manaColor, wellLine } from "@/lib/crystr";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireMe();
  const flash = readFlash();
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
            <div className="mana-label">MANA</div>
            <div className="mana-count" style={{ color: manaColor(mana) }}>
              {String(mana).padStart(2, "0")}/{MANA_CAP}
            </div>
          </div>
          <div className="gauge">
            <i style={{ width: `${Math.max(2, (mana / MANA_CAP) * 100)}%` }} />
          </div>
          <div className="head-foot">
            <span>{wellLine(mana)}</span>
            <WellButton low={mana < 11} />
          </div>
        </header>

        <main className="screen">{children}</main>

        {flash ? <Toast flash={flash} /> : null}

        <TabBar />
      </div>
    </div>
  );
}
