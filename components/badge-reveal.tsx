"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BodyPortal } from "@/components/portal";
import { Rays, playBuildUp, playClick, playFanfare, playLidOpen } from "@/components/ask-scene";
import { BadgeArt } from "@/components/badges";
import { KeyImg, useKey } from "@/components/quest-ask";
import { badgeSeen } from "@/lib/actions";
import type { UnseenBadge } from "@/lib/data";

const RAY_CY = 0.38;
const RIM = 21 * 5;
const GOLD = "#f2b544";
const ROMAN = ["", "I", "II", "III", "IV", "V"];
const up = (s: string) => s.toUpperCase();

/** A badge you earned without anyone handing you a key (filling your Top 5, a day more in the City): the
 *  chest, the key, and the badge rising out, the same as a quest done face to face. One at a time, each
 *  marked seen when you hit DONE, so it plays once. */
export function BadgeReveal({ list }: { list: UnseenBadge[] }) {
  const [i, setI] = useState(0);
  const b = list[i];
  const chest = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [lock, setLock] = useState<"shut" | "unlocking" | "open">("shut");
  const turn = () => {
    if (lock !== "shut") return;
    setLock("unlocking");
    playClick();
    window.setTimeout(playBuildUp, 140);
    window.setTimeout(() => { setLock("open"); playLidOpen(); window.setTimeout(playFanfare, 220); }, 1850);
  };
  const key = useKey(!!b && lock === "shut", chest, turn, undefined, turn);

  useLayoutEffect(() => {
    if (lock !== "open") return;
    const el = pop.current, sc = scene.current;
    if (!el || !sc) return;
    const r = el.getBoundingClientRect(), box = sc.getBoundingClientRect();
    el.style.setProperty("--rise", `${Math.round(box.top + box.height * RAY_CY - (r.top + r.height / 2))}px`);
  }, [lock]);

  if (!b) return null;
  const done = () => {
    void badgeSeen(b.slug);
    setLock("shut");
    setI(i + 1);
  };
  const title = b.tiers > 1 ? `${b.title} ${ROMAN[b.tier] ?? ""}`.trim() : b.title;

  return (
    <BodyPortal>
    <div ref={scene} role="dialog" aria-label={title} className="ask-scene dr-scene">
      <Rays bg={[52, 94, 200]} ray={[196, 44, 118]} />
      <div className={`ask-dim${lock === "unlocking" ? " is-on" : lock === "open" ? " is-after" : ""}`} aria-hidden />

      <div className="dr-top">
        <div className="px dr-title" style={{ color: "#8fa2ff" }}>{b.up ? "A BADGE STEPPED UP" : "A BADGE FOR YOU"}</div>
        <div className="px dr-count">{lock === "shut" ? "THE CITY GAVE YOU THE KEY!" : ""}</div>
      </div>

      <div className="ask-stage">
        <div ref={chest}>
          <div style={{ width: 230, height: 195, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", zIndex: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-shut" src="/ask/chest-closed-blue.png" alt="" width={230} height={165} draggable={false} style={{ display: lock === "open" ? "none" : "block", imageRendering: "pixelated", animation: lock === "shut" ? undefined : "none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-drop" src="/ask/chest-open-blue.png" alt="" width={225} height={195} draggable={false} style={{ display: lock === "open" ? "block" : "none", imageRendering: "pixelated" }} />
            {lock === "open" ? (
              <>
                <div className="dr-burst" style={{ "--rc": GOLD } as React.CSSProperties} aria-hidden />
                <div ref={pop} className="dr-pop" style={{ "--rc": GOLD } as React.CSSProperties}>
                  <BadgeArt b={{ art: b.art, slug: b.slug, tiers: b.tiers }} got tier={b.tier} size={96} />
                </div>
              </>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-drop" src="/ask/chest-open-blue.png" alt="" width={225} height={195} draggable={false} style={{ display: lock === "open" ? "block" : "none", position: "absolute", left: 2, bottom: 0, zIndex: 2, clipPath: `inset(${RIM}px 0 0 0)`, imageRendering: "pixelated", pointerEvents: "none" }} />
          </div>
        </div>
      </div>

      <div className="ask-bottom dr-bottom">
        {lock === "open" ? (
          <div className="px dr-result" aria-live="polite">
            <span className="dr-sub" style={{ color: "#d2cefd", fontSize: 13 }}>{b.up ? "STEPPED UP" : "YOU EARNED"}</span>
            <span className="dr-name" style={{ color: GOLD }}>{up(title)}</span>
          </div>
        ) : null}
        {lock === "shut" ? (
          <>
            <div className={`ask-key dr-key${key.held ? " is-held" : ""}`} role="button" tabIndex={0} aria-label="The key. Drag it to the chest, or tap it, to open it."
              {...key.handlers}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); turn(); } }}
              style={{ transform: key.pos ? `translate(${key.pos.x}px, ${key.pos.y}px)` : undefined, cursor: "grab", touchAction: "none" }}>
              <KeyImg />
            </div>
            <div className="px dr-hint" style={{ color: "#8fa2ff" }}>TURN THE KEY!</div>
          </>
        ) : null}
        {lock === "open" ? (
          <button type="button" className="px dr-close" style={{ background: "#3a64cc" }} onClick={done}>
            {i + 1 < list.length ? "NEXT" : "DONE"}
          </button>
        ) : null}
      </div>
    </div>
    </BodyPortal>
  );
}
