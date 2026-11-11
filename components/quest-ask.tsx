"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BodyPortal } from "@/components/portal";
import { Rays, playBuildUp, playClick, playFanfare, playLidOpen, playWhoosh } from "@/components/ask-scene";
import { BadgeArt } from "@/components/badges";
import { askLines } from "@/lib/ask-lines";
import { faceSrc, normalizePortrait } from "@/lib/portrait/core";

/** A quest done with someone, asked face to face, on both phones at once (like a battle or a trade).
 *  The one asked holds the key: drag it to the asker's face to give it (yes), or throw it away (no),
 *  within thirty seconds. Given, the asker's face breaks into a grin, and on the asker's phone the key
 *  appears under the chest: turn it, and the badge rises out as a Historikal does from a draw. */
export type QuestView = {
  ok: boolean; id: number; kind: "quest"; stage: "invite" | "yes" | "no" | "off" | "done"; seq: number; me: "a" | "b";
  them: { handle: string; name: string | null };
  slug: string; title: string | null; how: string | null; art: string | null; tiers: number;
  asker: { handle: string; id: string; face: unknown };
  left: number;
};

const up = (s: string) => s.toUpperCase();
const RAY_CY = 0.38;
const RIM = 21 * 5;
const GOLD = "#f2b544";
/** The big open grin, for when they get the key. */
const GRIN = "04";

/** The asker's head on nothing, as a picture. */
function headSrc(face: unknown, grin = false) {
  const c = normalizePortrait(face ?? {});
  return faceSrc(grin ? { ...c, mouth: GRIN } : c, { bare: true });
}

/** Dragging the key: where it is, and on letting go, whether it landed on `target` or was thrown. */
export function useKey(enabled: boolean, target: React.RefObject<HTMLElement | null>, onDrop: () => void, onThrow?: () => void, onTap?: () => void) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [fling, setFling] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const trail = useRef<{ x: number; y: number; t: number }[]>([]);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled) return;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY };
      trail.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current) return;
      setPos({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
      trail.current = [...trail.current.slice(-4), { x: e.clientX, y: e.clientY, t: performance.now() }];
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!start.current) return;
      const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y);
      start.current = null;
      const box = target.current?.getBoundingClientRect();
      if (box && e.clientX > box.left && e.clientX < box.right && e.clientY > box.top && e.clientY < box.bottom) { onDrop(); return; }
      if (moved < 8 && onTap) { setPos(null); onTap(); return; }
      const a = trail.current[0], b = trail.current[trail.current.length - 1];
      const dt = Math.max(1, b.t - a.t), vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      const off = e.clientX < 0 || e.clientY < 0 || e.clientX > window.innerWidth || e.clientY > window.innerHeight;
      if (onThrow && (Math.hypot(vx, vy) > 1.1 || off)) {
        setFling({ x: (pos?.x ?? 0) + vx * 900, y: (pos?.y ?? 0) + vy * 900 });
        onThrow();
        return;
      }
      setPos(null);
    },
    onPointerCancel: () => { start.current = null; setPos(null); },
  };
  return { pos: fling ?? pos, flung: !!fling, held: !!pos && !fling, handlers };
}

// eslint-disable-next-line @next/next/no-img-element
export const KeyImg = () => <img src="/ask/key.png" alt="" width={59} height={108} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;

export function QuestAskScreen({ v, close, answer, end }: { v: QuestView; close: () => void; answer: (yes: boolean) => Promise<void>; end: () => Promise<void> }) {
  return v.me === "b" ? <Asked v={v} close={close} answer={answer} end={end} /> : <Asker v={v} close={close} end={end} />;
}

/** The one being asked: the asker's face, the question, and the key. */
function Asked({ v, close, answer, end }: { v: QuestView; close: () => void; answer: (yes: boolean) => Promise<void>; end: () => Promise<void> }) {
  const face = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState<"yes" | "no" | "late" | null>(v.stage === "yes" ? "yes" : null);
  const [left, setLeft] = useState(v.left);
  const question = askLines(v.slug, v.asker.handle).question;
  const key = useKey(said === null, face, () => { setSaid("yes"); playClick(); window.setTimeout(playFanfare, 150); void answer(true); }, () => { setSaid("no"); playWhoosh(); void answer(false); window.setTimeout(close, 900); });

  // Thirty seconds to decide.
  useEffect(() => {
    if (said) return;
    if (left <= 0) { setSaid("late"); void end(); return; }
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, said, end]);
  // If it's gone from under us (the asker closed it), there's nothing to answer.
  useEffect(() => { if (!said && (v.stage === "off" || v.stage === "done")) close(); }, [v.stage, said, close]);

  return (
    <BodyPortal>
    <div role="dialog" aria-label={question} className="ask-scene qa-scene">
      <Rays bg={[52, 24, 96]} ray={[118, 52, 150]} />
      <div className="px ask-question">{said === "yes" ? `${up(v.asker.handle)} GOT THE KEY!` : said === "late" ? "TOO LATE" : up(question)}</div>

      <div className="qa-middle">
        <div ref={face} className={said === "yes" ? "qa-head qa-bounce" : "qa-head qa-rock"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headSrc(v.asker.face, said === "yes")} alt={v.asker.handle} width={220} height={220} draggable={false} />
        </div>
        {said === "yes" ? (
          <div className="px qa-note">THEY&apos;RE OPENING<br />THEIR CHEST NOW</div>
        ) : said === "late" ? (
          <div className="px qa-note">THE KEY WENT BACK.<br />THEY CAN ASK AGAIN.</div>
        ) : (
          <div className="qa-quest">
            <BadgeArt b={{ art: v.art, slug: v.slug, tiers: v.tiers }} got tier={1} size={36} />
            <div>
              <div className="px" style={{ fontSize: 11, color: "#ffe38b" }}>QUEST · {up(v.title ?? "")}</div>
              <div style={{ fontSize: 12, color: "#d2cefd" }}>{v.how}</div>
            </div>
          </div>
        )}
      </div>

      <div className="ask-bottom">
        {said === null || said === "no" ? (
          <>
            <div
              className={`ask-key${key.held ? " is-held" : ""}${key.flung ? " is-thrown" : ""}`}
              role="button"
              tabIndex={0}
              aria-label="The key. Drag it to their face to give it to them (yes), or throw it away (no). Enter for yes, Delete for no."
              {...key.handlers}
              onKeyDown={(e) => {
                if (said) return;
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSaid("yes"); void answer(true); }
                if (e.key === "Delete" || e.key === "Backspace" || e.key === "Escape") { e.preventDefault(); setSaid("no"); void answer(false); window.setTimeout(close, 900); }
              }}
              style={{ transform: key.pos ? `translate(${key.pos.x}px, ${key.pos.y}px)${key.flung ? " rotate(540deg)" : ""}` : undefined, cursor: "grab", touchAction: "none" }}
            >
              <KeyImg />
            </div>
            <div className="ask-hints" aria-hidden="true">
              <div className="px ask-hint ask-yes"><b>YES!</b><span>GIVE THEM</span><span style={{ marginTop: 0 }}>THE KEY!</span></div>
              <div className="px ask-hint ask-no"><b>NO!</b><span>THROW AWAY</span><span style={{ marginTop: 0 }}>THE KEY!</span></div>
            </div>
            {said === null ? <div className="qa-timer" aria-label={`${left} seconds left`}><i style={{ width: `${(left / 30) * 100}%` }} /></div> : null}
          </>
        ) : (
          <button type="button" className="px qa-done" onClick={close}>CLOSE</button>
        )}
      </div>
    </div>
    </BodyPortal>
  );
}

/** The one asking: the chest, waiting for the key; then turn it and the badge rises. */
function Asker({ v, close, end }: { v: QuestView; close: () => void; end: () => Promise<void> }) {
  const chest = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [lock, setLock] = useState<"shut" | "unlocking" | "open">("shut");
  const [left, setLeft] = useState(v.left);
  const help = v.slug === "a-helping-hand";
  const turn = () => {
    if (lock !== "shut") return;
    setLock("unlocking");
    playClick();
    window.setTimeout(playBuildUp, 140);
    window.setTimeout(() => { setLock("open"); playLidOpen(); window.setTimeout(playFanfare, 220); }, 1850);
  };
  const key = useKey(v.stage === "yes" && lock === "shut", chest, turn, undefined, turn);

  useEffect(() => {
    if (v.stage !== "invite") return;
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, v.stage]);
  // Out of time: the key never came.
  const timedOut = v.stage === "invite" && left <= 0;
  useEffect(() => { if (timedOut) void end(); }, [timedOut, end]);

  // How far the badge climbs: from the chest's mouth to where the rays meet.
  useLayoutEffect(() => {
    if (lock !== "open") return;
    const b = pop.current, sc = scene.current;
    if (!b || !sc) return;
    const r = b.getBoundingClientRect(), box = sc.getBoundingClientRect();
    b.style.setProperty("--rise", `${Math.round(box.top + box.height * RAY_CY - (r.top + r.height / 2))}px`);
  }, [lock]);

  const done = () => { void end(); close(); };
  const shutOut = v.stage === "no" || v.stage === "off" || timedOut;

  return (
    <BodyPortal>
    <div ref={scene} role="dialog" aria-label={v.title ?? "Quest"} className="ask-scene dr-scene">
      <Rays bg={[52, 94, 200]} ray={[196, 44, 118]} />
      <div className={`ask-dim${lock === "unlocking" ? " is-on" : lock === "open" ? " is-after" : ""}`} aria-hidden />

      <div className="dr-top">
        <div className="px dr-title" style={{ color: "#8fa2ff" }}>{up(v.title ?? "")}</div>
        <div className="px dr-count">
          {v.stage === "invite" && !timedOut ? (
            <>WAITING ON {up(v.them.handle)}<span className="ask-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span></>
          ) : v.stage === "yes" && lock === "shut" ? `${up(v.them.handle)} GAVE YOU THE KEY!` : v.stage === "no" ? `${up(v.them.handle)} THREW AWAY THE KEY` : timedOut || v.stage === "off" ? "NO ANSWER" : ""}
        </div>
      </div>

      <div className="ask-stage" style={shutOut ? { opacity: 0.45, filter: "grayscale(.6)" } : undefined}>
        <div ref={chest}>
          <div style={{ width: 230, height: 195, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", zIndex: 2 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-shut" src="/ask/chest-closed-blue.png" alt="" width={230} height={165} draggable={false} style={{ display: lock === "open" ? "none" : "block", imageRendering: "pixelated", animation: lock === "shut" && !shutOut ? undefined : "none" }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="ask-drop" src="/ask/chest-open-blue.png" alt="" width={225} height={195} draggable={false} style={{ display: lock === "open" ? "block" : "none", imageRendering: "pixelated" }} />
            {lock === "open" ? (
              <>
                <div className="dr-burst" style={{ "--rc": GOLD } as React.CSSProperties} aria-hidden />
                <div ref={pop} className="dr-pop" style={{ "--rc": GOLD } as React.CSSProperties}>
                  <BadgeArt b={{ art: v.art, slug: v.slug, tiers: v.tiers }} got tier={1} size={96} />
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
            <span className="dr-sub" style={{ color: "#d2cefd", fontSize: 13 }}>{help ? "YOU HELPED THEM" : "YOU EARNED"}</span>
            <span className="dr-name" style={{ color: GOLD }}>{help ? "HELP COUNTED" : up(v.title ?? "")}</span>
          </div>
        ) : null}
        {v.stage === "yes" && lock === "shut" ? (
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
        {v.stage === "invite" && !timedOut ? (
          <>
            <div className="qa-timer" aria-label={`${left} seconds left`}><i style={{ width: `${(left / 30) * 100}%` }} /></div>
            <div className="px" style={{ fontSize: 11, color: "#d2cefd" }}>THEY HOLD THE KEY</div>
          </>
        ) : null}
        {shutOut ? (
          <div style={{ fontSize: 13, color: "#d2cefd", textAlign: "center", maxWidth: 280, lineHeight: 1.5, position: "relative", zIndex: 4 }}>
            {v.stage === "no" ? "Not this time. The quest is still open: try it with someone else, or again another day." : "They didn't answer in time. Ask again when they're ready."}
          </div>
        ) : null}
        {lock === "unlocking" ? null : (
          <button type="button" className="px dr-close" style={lock === "open" || shutOut ? { background: "#3a64cc" } : undefined} onClick={done}>
            {lock === "open" ? "DONE" : shutOut ? "OK" : "CLOSE"}
          </button>
        )}
      </div>
    </div>
    </BodyPortal>
  );
}
