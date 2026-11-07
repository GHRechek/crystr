"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { untilReady } from "@/lib/crystr";

/** A Well task as the restore sheet shows it. */
export type RestoreTask = { slug: string; glyph: string; chip: string; title: string; sub: string; reward: number; ready_at: string | null };

/** The mana potion, in the app's colours. It sits inline with text; a screen reader says "mana". */
export function ManaIcon({ big }: { big?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mana.png"
      alt="mana"
      title="Mana"
      width={big ? 26 : 13}
      height={big ? 26 : 13}
      className={big ? "mana-icon mana-icon-lg" : "mana-icon"}
    />
  );
}

/** The potion with a number inside it. The bottle is one sheet (magenta for what you spend,
 *  blue for what you get back); the number is a mask over it painted in the surrounding text
 *  colour, so it always matches the button it sits in. */
function Bottle({ n, gain }: { n: number; gain?: boolean }) {
  if (!Number.isInteger(n) || n < 0 || n > 20) return <span>{n}</span>;
  return (
    <span aria-hidden className={gain ? "mana-bottle mana-bottle-gain" : "mana-bottle"}>
      <span className="mana-digits" style={{ ["--x" as string]: `-${n * 11}px` } as React.CSSProperties} />
    </span>
  );
}

/** A price, at the end of the button that takes it: "-" and the potion with the cost inside. */
export function Cost({ n }: { n: number }) {
  return (
    <span className="cost" role="img" aria-label={`costs ${n} mana`} title={`${n} mana`}>
      -<Bottle n={n} />
    </span>
  );
}

/** A reward: "+" and the potion with the amount inside. */
export function Gain({ n }: { n: number }) {
  return (
    <span className="cost" role="img" aria-label={`restores ${n} mana`} title={`${n} mana`}>
      +<Bottle n={n} gain />
    </span>
  );
}

/** How hard the potion shakes, 0 to 4, from how full the meter is: still above half, a
 *  gentle pulse below, and a constant rattle when it is nearly empty. */
export function shakeLevel(mana: number, cap: number): 0 | 1 | 2 | 3 | 4 {
  if (mana <= 0) return 4;
  const f = mana / Math.max(1, cap);
  if (f <= 0.12) return 3;
  if (f <= 0.25) return 2;
  if (f <= 0.5) return 1;
  return 0;
}

/** The potion beside the mana count in the header, and the way to the Well: tap it to go and
 *  refill. It shakes harder the lower the meter gets. Running low (`tasks` given), tapping it
 *  opens a restore sheet right there instead: the Well's tasks, each one tap away. */
export function ManaButton({ mana, cap, closed, tasks }: { mana: number; cap: number; closed?: boolean; tasks?: RestoreTask[] }) {
  const path = usePathname();
  const here = path.startsWith("/well");
  const level = shakeLevel(mana, cap);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  // Before registering the Well is shut: the potion is just a potion.
  if (closed) {
    return (
      <span aria-label={`${mana} of ${cap} mana`} className="mana-well" data-shake={level} style={{ minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
      </span>
    );
  }
  if (tasks && !here) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Restore mana. You have ${mana} of ${cap}.`}
          title="Restore mana"
          className="mana-well"
          data-shake={level}
          style={{ minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: 0, padding: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
        </button>
        {open ? <RestoreSheet mana={mana} cap={cap} tasks={tasks} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }
  return (
    <Link
      href="/well"
      prefetch={false}
      aria-label={`The Well. You have ${mana} of ${cap} mana.`}
      title="The Well"
      className="mana-well"
      data-shake={level}
      data-here={here}
      style={{ minHeight: 40, minWidth: 40, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mana.png" alt="" width={26} height={26} className="mana-icon mana-icon-lg" />
    </Link>
  );
}

/** Low on mana: the Well, brought to you. Each task goes straight to itself; one cooling down
 *  says when it's back. */
function RestoreSheet({ mana, cap, tasks, onClose }: { mana: number; cap: number; tasks: RestoreTask[]; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const soonest = tasks.every((t) => t.ready_at) ? tasks.map((t) => t.ready_at!).sort()[0] : null;
  return (
    <div role="dialog" aria-label="Restore mana" className="restore-wrap" onClick={onClose}>
      <div className="restore-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mana.png" alt="" width={34} height={34} style={{ imageRendering: "pixelated", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="px" style={{ fontSize: 13, color: "#fff" }}>RESTORE MANA</div>
            <div className="px" style={{ fontSize: 10, color: "var(--mag-soft)", marginTop: 3 }}>RUNNING LOW · {mana}/{cap}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>✕</button>
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          {soonest ? `Everything at the Well is resting. The first is back in ${untilReady(soonest)}.` : "Do one of these and it comes straight back."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tasks.map((q) => {
            const waiting = !!q.ready_at;
            const row = (
              <>
                <div className="avatar" style={{ width: 36, height: 36, background: q.chip, fontSize: 13, opacity: waiting ? 0.5 : 1 }}>{q.glyph}</div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{q.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{q.sub}</div>
                </div>
                <div className="px" style={{ fontSize: waiting ? 9 : 12, color: waiting ? "var(--dim)" : "var(--blu-soft)", flex: "none", textAlign: "right", lineHeight: 1.5 }}>
                  {waiting ? `IN ${untilReady(q.ready_at!)}` : `+${q.reward}`}
                </div>
              </>
            );
            return waiting ? (
              <div key={q.slug} className="rowcard" aria-disabled style={{ padding: 12, minHeight: 60, gap: 12 }}>{row}</div>
            ) : (
              <Link key={q.slug} href={`/well/${q.slug}`} prefetch={false} className="rowcard" style={{ padding: 12, minHeight: 60, gap: 12 }}>{row}</Link>
            );
          })}
        </div>
        <Link href="/well" prefetch={false} className="px" style={{ fontSize: 11, color: "var(--pur-pale)", alignSelf: "center", padding: 8 }}>THE WELL →</Link>
      </div>
    </div>
  );
}
