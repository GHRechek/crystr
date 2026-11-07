"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Rays, playBuildUp, playClick, playFanfare, playLidOpen, playWhoosh } from "@/components/ask-scene";
import { RARITY_COLOR, historikalSrc, type Element, type MoveKind, type Rarity } from "@/lib/historikals";

/* Face to face, after a scan: a trade or a battle on both phones at once. The server holds the whole thing
   (supabase/migrations/20261108390000_encounters.sql) and tells each phone only its own side; this draws it.
   The host sits in the app's layout: it notices when someone starts one with you, opens the screen on both
   phones, and keeps it fresh about once a second while it is open. */

type HK = { id: number; slug: string; name: string; rarity: Rarity; element?: Element; hearts: number; moves?: { name: string; kind: MoveKind }[]; hp?: number; seen?: string[] };
type Side = { swap: boolean; from: string; to: string; move: string | null; hit: number };
type View = {
  ok: boolean; id: number; kind: "trade" | "battle"; stage: string; seq: number; me: "a" | "b";
  them: { handle: string; name: string | null }; off_by: "me" | "them" | null;
  mine?: HK[]; my_pick?: HK | null; their_pick?: HK | null; got?: HK | null;
  team?: HK[]; ready?: boolean; their_ready?: boolean; pick?: number | null; their_picked?: boolean; lock?: boolean; their_lock?: boolean;
  swapped?: boolean; turn?: number; quiet?: number; move?: { m?: number; swap?: number } | null; their_moved?: boolean; need?: boolean; their_need?: boolean;
  shadow?: string; left?: number; their_pips?: { ko: boolean; cur: boolean }[]; theirs?: HK; last?: { turn: number; line: string; extra: string; a: Side; b: Side } | null;
  alive?: number; their_alive?: number;
};

const supabase = () => createClient();

/** Start one with someone you have just scanned; their phone and yours both open it. */
export async function startEncounter(kind: "trade" | "battle", otherId: string): Promise<boolean> {
  const { data } = await supabase().rpc("cr_enc_start", { p_kind: kind, p_other: otherId });
  const r = data as { ok: boolean; id?: number } | null;
  if (r?.ok && r.id) window.dispatchEvent(new CustomEvent("crystr:encounter", { detail: r.id }));
  return !!r?.ok;
}

export function EncounterHost() {
  const [id, setId] = useState<number | null>(null);
  const [view, setView] = useState<View | null>(null);
  const closed = useRef(new Set<number>());

  // Is anyone starting one with me? Checked every few seconds while the page is in front of you.
  useEffect(() => {
    const open = (n: number) => { if (!closed.current.has(n)) setId(n); };
    const onStart = (e: Event) => open((e as CustomEvent<number>).detail);
    window.addEventListener("crystr:encounter", onStart);
    const look = async () => {
      if (document.hidden) return;
      const { data } = await supabase().rpc("cr_enc_mine");
      const r = data as { id: number } | null;
      if (r?.id) open(r.id);
    };
    look();
    const t = window.setInterval(look, 3500);
    return () => { window.removeEventListener("crystr:encounter", onStart); window.clearInterval(t); };
  }, []);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase().rpc("cr_enc_view", { p_id: id });
    const v = data as View | null;
    if (v?.ok) setView((old) => (old && old.id === v.id && old.seq === v.seq && v.stage !== "shadow" ? old : v));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    refresh();
    const t = window.setInterval(refresh, 900);
    return () => window.clearInterval(t);
  }, [id, refresh]);

  const act = useCallback(async (a: Record<string, unknown>) => {
    if (!id) return;
    await supabase().rpc("cr_enc_act", { p_id: id, p_act: a });
    await refresh();
  }, [id, refresh]);

  const close = useCallback(() => {
    if (id) closed.current.add(id);
    setId(null);
    setView(null);
  }, [id]);

  if (!id || !view || view.id !== id) return null;
  return view.kind === "trade" ? <TradeScreen v={view} act={act} close={close} /> : <BattleScreen v={view} act={act} close={close} />;
}

/* ---------------------------------------------------------------- pieces */

const up = (s: string) => s.toUpperCase();

/** A little pixel picture from rows of # and . */
function Pix({ rows, k, fill, dim }: { rows: string[]; k: number; fill: string; dim?: boolean }) {
  return (
    <svg width={rows[0].length * k} height={rows.length * k} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill={fill} aria-hidden opacity={dim ? 0.18 : 1} style={{ flex: "none", filter: `drop-shadow(${k}px ${k}px 0 #0a0616)` }}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  );
}
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
const MOVE: Record<MoveKind, string[]> = {
  sword: ["......#", ".....##", "....##.", "#..##..", ".###...", "..#....", ".#.#..."],
  spell: ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
  armor: ["#######", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
};
const TYPE: Record<Element, string[]> = {
  fire: ["...#...", "..##...", "..###..", ".####.#", ".######", "#######", ".#####."],
  water: ["...#...", "..###..", "..###..", ".#####.", "#######", "#######", ".#####."],
  grass: ["....###", "..#####", ".######", "######.", "#####..", "####...", "#......"],
  rock: ["..###..", ".#####.", "#######", "#######", "#######", ".######", "..####."],
  dark: ["..####.", ".###...", "###....", "###....", "###....", ".###...", "..####."],
  light: ["#..#..#", ".#...#.", "..###..", "#.###.#", "..###..", ".#...#.", "#..#..#"],
};
const QMARK = [".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."];
const SWORDS = ["#.......#", ".#.....#.", "..#...#..", "...#.#...", "....#....", "...#.#...", ".##...##.", ".##...##.", "#.......#"];
const TRADE_ARROWS = ["......#..", ".......#.", "#########", ".......#.", "......#..", ".........", "..#......", ".#.......", "#########", ".#.......", "..#......"];
const UNDO = ["..#.......", ".##.......", "#######...", ".##....#..", "..#.....#.", ".........#", ".........#", "........#.", "...#####.."];
const SWAP = ["...#...", "....#..", "#######", "....#..", "..#.#..", ".#.....", "#######"];

/** Element (in its rarity's colour, or ? until you know it) then white hearts. */
function Stats({ h, hp, k = 3, known = true }: { h: HK; hp?: number; k?: number; known?: boolean }) {
  const left = hp ?? h.hearts;
  return (
    <span className="en-stats">
      {known && h.element ? <Pix rows={TYPE[h.element]} k={k} fill={RARITY_COLOR[h.rarity]} /> : <Pix rows={QMARK} k={k} fill="#d2cefd" />}
      {Array.from({ length: h.hearts }, (_, i) => <Pix key={i} rows={HEART} k={k} fill="#fff" dim={i >= left} />)}
    </span>
  );
}

/** A creature, idling between its two frames. */
function Creature({ slug, size, shadow }: { slug: string; size: number; shadow?: boolean }) {
  const [f, setF] = useState<1 | 2>(1);
  useEffect(() => {
    if (shadow) return;
    const t = window.setInterval(() => setF((x) => (x === 1 ? 2 : 1)), 500);
    return () => window.clearInterval(t);
  }, [shadow]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={shadow ? `/creatures/${slug}-s.png` : historikalSrc(slug, f)} alt="" width={size} height={size} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;
}

/** Drag a creature: up into the target (or anywhere above it) or back down. A tap does nothing. */
function useDrag(onUp: () => void, onDown: () => void, target: React.RefObject<HTMLElement | null>, enabled = true) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);
  const st = useRef<{ x: number; y: number } | null>(null);
  const bind = enabled ? {
    onPointerDown: (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); st.current = { x: e.clientX, y: e.clientY }; setHeld(true); },
    onPointerMove: (e: React.PointerEvent) => { if (st.current) setPos({ x: e.clientX - st.current.x, y: e.clientY - st.current.y }); },
    onPointerUp: (e: React.PointerEvent) => {
      if (!st.current) return;
      const dy = e.clientY - st.current.y; st.current = null; setHeld(false);
      const box = target.current?.getBoundingClientRect();
      if (box && e.clientY < box.bottom + 30 && e.clientX > box.left - 50 && e.clientX < box.right + 50) onUp();
      else if (dy > 60) onDown();
      setPos({ x: 0, y: 0 });
    },
    onPointerCancel: () => { st.current = null; setHeld(false); setPos({ x: 0, y: 0 }); },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onUp(); } if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onDown(); } },
    tabIndex: 0, role: "button" as const,
  } : {};
  return { bind, style: { transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: "none" as const }, held };
}

function Shell({ kind, children, dim }: { kind: "trade" | "battle"; children: React.ReactNode; dim?: "on" | "after" }) {
  return (
    <div role="dialog" aria-label={kind === "trade" ? "Trade" : "Battle"} className={`en-scene en-${kind}`}>
      {kind === "trade" ? <Rays bg={[50, 86, 190]} ray={[76, 125, 240]} /> : <Rays bg={[36, 14, 50]} ray={[88, 22, 66]} />}
      <div className={`en-dim${dim ? ` is-${dim}` : ""}`} aria-hidden />
      {children}
    </div>
  );
}

function Closed({ v, close, what }: { v: View; close: () => void; what: string }) {
  return (
    <div className="en-closed">
      <div className="px">
        <b>{what} CALLED OFF</b>
        {v.off_by === "me" ? "You walked away." : v.off_by === "them" ? `${up(v.them.handle)} walked away.` : "Something else started."}
        <button type="button" className="px en-btn" onClick={close}>CLOSE</button>
      </div>
    </div>
  );
}

function Invite({ v, act, kind }: { v: View; act: (a: Record<string, unknown>) => void; kind: "trade" | "battle" }) {
  const icon = <div className="en-icon" style={{ background: kind === "trade" ? "#c42c76" : "#5a1f6e" }}><Pix rows={kind === "trade" ? TRADE_ARROWS : SWORDS} k={6} fill="#fff" /></div>;
  if (v.me === "b") {
    return (
      <>
        <div className="px en-q">{up(v.them.handle)} WANTS TO {kind === "trade" ? "TRADE" : "BATTLE"}</div>
        <div className="px en-big">{icon}{kind === "trade" ? "TRADE WITH" : "BATTLE"}<b>{up(v.them.handle)}?</b></div>
        <div className="en-invite">
          <button type="button" className="px" style={{ background: kind === "trade" ? "#3a64cc" : "#5a1f6e" }} onClick={() => { playClick(); act({ do: "yes" }); }}>{kind === "trade" ? "YES, LET'S TRADE" : "YES, LET'S FIGHT"}</button>
          <button type="button" className="px" style={{ background: "#c42c76" }} onClick={() => { playWhoosh(); act({ do: "no" }); }}>NOT NOW</button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="px en-q">{kind === "trade" ? "ASKING" : "CHALLENGING"} {up(v.them.handle)}<Dots /></div>
      <div className="px en-big">{icon}WAITING ON<b>{up(v.them.handle)}</b></div>
      <Nevermind onClick={() => act({ do: "leave" })} />
    </>
  );
}
const Dots = () => <span className="en-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span>;
const Nevermind = ({ onClick }: { onClick: () => void }) => (
  <button type="button" className="px en-nevermind" aria-label="Nevermind, call it off" onClick={() => { playWhoosh(); onClick(); }}><Pix rows={UNDO} k={3} fill="#e0398a" />NEVERMIND</button>
);

/** Your Historikals in one row you can swipe. */
function Shelf({ items, onPick, label, hp }: { items: HK[]; onPick: (h: HK) => void; label: string; hp?: (h: HK) => number }) {
  return (
    <div className="en-shelf">
      <div className="px en-say">{label}</div>
      <div className="en-row">
        {items.map((h) => (
          <button key={h.id} type="button" onClick={() => { playClick(); onPick(h); }} aria-label={`${h.name}, ${h.rarity}`}>
            <Creature slug={h.slug} size={64} />
            <span className="en-mini"><Stats h={h} hp={hp?.(h)} k={2} /></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- trade */

export function TradeScreen({ v, act, close }: { v: View; act: (a: Record<string, unknown>) => void; close: () => void }) {
  const mid = useRef<HTMLDivElement>(null);
  const mine = v.my_pick, theirs = v.their_pick;
  const drag = useDrag(() => { if (theirs) { playClick(); act({ do: "swap" }); } }, () => act({ do: "unpick" }), mid, v.stage === "pick" && !!mine);
  useEffect(() => { if (v.stage === "done") { playLidOpen(); window.setTimeout(playFanfare, 200); } }, [v.stage]);
  return (
    <Shell kind="trade">
      {v.stage === "off" ? <Closed v={v} close={close} what="TRADE" /> : null}
      {v.stage === "invite" ? <Invite v={v} act={act} kind="trade" /> : null}
      {v.stage === "pick" ? (
        <>
          <div className="px en-q">{theirs ? `${up(v.them.handle)} OFFERS` : <>{up(v.them.handle)} IS CHOOSING<Dots /></>}</div>
          <div className="en-mid" ref={mid}>{theirs ? <Creature slug={theirs.slug} size={102} /> : <div className="px en-qmark">?</div>}</div>
          {theirs ? <div className="px en-midlabel">THEIR OFFER<b>{up(theirs.name)}</b><Stats h={theirs} k={2} /></div> : null}
          {!mine ? (
            (v.mine ?? []).length ? (
              <>
                <Shelf items={v.mine ?? []} label="PICK WHAT YOU'LL OFFER" onPick={(h) => act({ do: "pick", item: h.id })} />
                <div className="en-bottom"><Nevermind onClick={() => act({ do: "leave" })} /></div>
              </>
            ) : (
              <div className="en-shelf"><div className="px en-say">YOU HAVE NO HISTORIKALS YET</div><Nevermind onClick={() => act({ do: "leave" })} /></div>
            )
          ) : (
            <>
              <div className={`en-mine${drag.held ? " held" : ""}`} {...drag.bind} style={drag.style} aria-label={`Your offer, ${mine.name}. Drag it up to theirs to swap, or back down to pick another.`}>
                <div className="en-float"><Creature slug={mine.slug} size={72} /></div>
              </div>
              <div className="en-hints" aria-hidden>
                {theirs ? <div className="px en-hint yes"><b>YES!</b><span>SWAP</span><span>THE BADGE!</span></div> : <div className="px en-hint yes"><b>WAIT!</b><span>THEY&apos;RE</span><span>CHOOSING</span></div>}
                <div className="px en-hint no"><b>NAH.</b><span>DRAG YOURS</span><span>BACK</span></div>
              </div>
            </>
          )}
        </>
      ) : null}
      {v.stage === "done" && v.got ? (
        <>
          <div className="px en-q">TRADE!</div>
          <div className="en-mid en-rise"><Creature slug={v.got.slug} size={102} /></div>
          <div className="px en-midlabel">YOU GOT<b>{up(v.got.name)}</b><Stats h={v.got} k={2} /></div>
          <div className="en-bottom" style={{ bottom: 120 }}><button type="button" className="px en-btn" onClick={close}>CLOSE</button></div>
        </>
      ) : null}
    </Shell>
  );
}

/* ---------------------------------------------------------------- battle */

export function BattleScreen({ v, act, close }: { v: View; act: (a: Record<string, unknown>) => void; close: () => void }) {
  const mid = useRef<HTMLDivElement>(null);
  const [team, setTeam] = useState<number[]>([]);
  const [swapping, setSwapping] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const shown = useRef<number | null>(null); // the turn whose clash we've played
  const [lunge, setLunge] = useState(false);
  const [left, setLeft] = useState(0);
  const prevStage = useRef(v.stage);
  const me = (v.team ?? []).find((h) => h.id === v.pick) ?? null;
  const drag = useDrag(() => act({ do: "lock" }), () => act({ do: "unpick" }), mid, v.stage === "pick" && !!me && !v.lock);

  // The swap window ticks down here; the server keeps the real time.
  useEffect(() => {
    if (v.stage !== "shadow") return;
    const end = Date.now() + (v.left ?? 0) * 1000;
    const tick = () => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [v.stage, v.seq, v.left]);

  // Into the fight: dim, drumroll, then the real ones. Each settled turn: lunge, sound.
  useEffect(() => {
    const was = prevStage.current;
    prevStage.current = v.stage;
    if (v.stage === "fight" && was === "shadow") {
      setRevealing(true); playBuildUp();
      const t = window.setTimeout(() => { setRevealing(false); playLidOpen(); }, 1850);
      return () => window.clearTimeout(t);
    }
    if (v.stage === "end" && was !== "end") window.setTimeout(playFanfare, 900);
  }, [v.stage]);
  useEffect(() => {
    const t = v.last?.turn;
    if (!t || t === shown.current) return;
    shown.current = t; setLunge(true); playClick();
    window.setTimeout(() => setLunge(false), 260); // left to run: it only ever settles the lunge back
  }, [v.last?.turn]);

  const mySide = v.me, theirSide = v.me === "a" ? "b" : "a";
  const alive = (v.team ?? []).filter((h) => (h.hp ?? 0) > 0);
  const bench = alive.filter((h) => h.id !== v.pick);
  const fighting = ["fight", "replace", "end"].includes(v.stage) && !revealing;

  return (
    <Shell kind="battle" dim={revealing ? "on" : v.stage === "end" ? "after" : undefined}>
      {v.stage === "off" ? <Closed v={v} close={close} what="BATTLE" /> : null}
      {v.stage === "invite" ? <Invite v={v} act={act} kind="battle" /> : null}

      {v.stage === "team" ? (
        v.ready ? (
          <><div className="px en-q">WAITING ON {up(v.them.handle)}<Dots /></div><div className="px en-big">{up(v.them.handle)}<b>IS PICKING A TEAM</b></div></>
        ) : (v.mine ?? []).length < 3 ? (
          <><div className="px en-q">PICK YOUR TEAM OF 3</div><div className="px en-big">YOU NEED<b>3 HISTORIKALS</b>TO BATTLE</div><div className="en-bottom"><Nevermind onClick={() => act({ do: "leave" })} /></div></>
        ) : (
          <>
            <div className="px en-q">PICK YOUR TEAM OF 3</div>
            <div className="en-grid">
              {(v.mine ?? []).map((h) => { const n = team.indexOf(h.id); return (
                <button key={h.id} type="button" className={`en-pickc${n >= 0 ? " on" : ""}`} aria-pressed={n >= 0} aria-label={h.name}
                  onClick={() => { playClick(); setTeam((t) => (n >= 0 ? t.filter((x) => x !== h.id) : t.length < 3 ? [...t, h.id] : t)); }}>
                  <Creature slug={h.slug} size={56} /><span className="en-mini"><Stats h={h} k={2} /></span>{n >= 0 ? <b className="px en-num">{n + 1}</b> : null}
                </button>); })}
            </div>
            <div className="en-bottom">
              <button type="button" className="px en-btn" disabled={team.length !== 3} onClick={() => act({ do: "team", ids: team })}>{team.length === 3 ? "BRING THESE 3" : `PICK ${3 - team.length} MORE`}</button>
              <Nevermind onClick={() => act({ do: "leave" })} />
            </div>
          </>
        )
      ) : null}

      {v.stage === "pick" ? (
        <>
          <div className="px en-q">{v.their_lock ? `${up(v.them.handle)} IS READY` : v.their_picked ? `${up(v.them.handle)} HAS PICKED` : <>{up(v.them.handle)} IS CHOOSING<Dots /></>}</div>
          <div className="en-mid" ref={mid}><div className="px en-qmark">?</div></div>
          {!me ? (
            <><Shelf items={v.team ?? []} label="WHO GOES FIRST?" onPick={(h) => act({ do: "pick", item: h.id })} /><div className="en-bottom"><Nevermind onClick={() => act({ do: "leave" })} /></div></>
          ) : (
            <>
              <div className={`en-mine en-fighter${drag.held ? " held" : ""}`} {...drag.bind} style={drag.style} aria-label={`Your fighter, ${me.name}. Drag it up into the question mark to lock in, or back down to pick again.`}>
                <div className={v.lock ? "" : "en-float"}><Creature slug={me.slug} size={96} /></div>
              </div>
              <div className="en-tag en-tag-me"><span className="px en-name">{up(me.name)}</span><Stats h={me} /></div>
              {v.lock ? <div className="px en-status">READY · WAITING ON {up(v.them.handle)}</div> : (
                <div className="en-hints" aria-hidden>
                  <div className="px en-hint yes"><b>FIGHT!</b><span>DRAG IT</span><span>INTO THE ?</span></div>
                  <div className="px en-hint no"><b>NAH.</b><span>DRAG IT</span><span>BACK</span></div>
                </div>
              )}
            </>
          )}
        </>
      ) : null}

      {v.stage === "shadow" && me ? (
        <>
          <div className="px en-q">LAST CHANCE TO SWAP</div>
          <div className="en-mid en-sil" aria-label={`${v.them.handle}'s fighter, in shadow`}>{v.shadow ? <Creature slug={v.shadow} size={102} shadow /> : null}</div>
          <div className="px en-count" aria-live="polite">{left || ""}</div>
          <div className="en-me-sm"><Creature slug={me.slug} size={84} /></div>
          <div className="en-tag en-tag-sm"><span className="px en-name">{up(me.name)}</span><Stats h={me} /></div>
          <div className="en-bench">
            {v.swapped ? <span className="px en-say">SWAPPED · THEY STILL SEE YOUR OLD SHADOW</span> : (
              <><span className="px en-say">SWAP? THEY WON&apos;T SEE IT</span>
              <div className="en-benchrow">{(v.team ?? []).filter((h) => h.id !== v.pick).map((h) => (
                <button key={h.id} type="button" onClick={() => { playClick(); act({ do: "swapin", item: h.id }); }} aria-label={`Swap to ${h.name}`}><Creature slug={h.slug} size={48} /></button>
              ))}</div></>
            )}
          </div>
        </>
      ) : null}

      {revealing ? <div className="px en-q">BATTLE!</div> : null}

      {fighting && me && v.theirs ? (
        <>
          <div className="px en-q">{v.stage === "end" ? "" : v.stage === "replace" ? "KNOCKED OUT!" : `TURN ${v.turn}`}</div>
          <div className={`en-them${(v.theirs.hp ?? 0) <= 0 ? " down" : ""}`} style={lunge ? { transform: "translateY(110px)" } : undefined}><Creature slug={v.theirs.slug} size={102} /></div>
          <div className="en-tag en-tag-them">
            <span className="px en-name">{up(v.theirs.name)}</span>
            <Stats h={v.theirs} hp={v.theirs.hp} known={!!v.theirs.element} />
            <span className="px en-seen">{v.theirs.seen?.length ? `SEEN: ${v.theirs.seen.map(up).join(" · ")}` : "MOVES: ???"}</span>
            <span className="en-pips">{(v.their_pips ?? []).map((p, i) => <i key={i} className={`${p.ko ? "ko" : ""}${p.cur ? " cur" : ""}`} />)}</span>
          </div>
          {v.last && v.stage !== "end" ? (
            <div className="px en-say-big" key={v.last.turn}>
              <span className="en-vs">{v.last[mySide].swap ? `${up(v.last[mySide].from)} → ${up(v.last[mySide].to)}` : up(v.last[mySide].move ?? "")} <i>vs</i> {v.last[theirSide].swap ? "SWAP" : up(v.last[theirSide].move ?? "")}</span>
              <span>{v.last.line}</span>{v.last.extra ? <b>{v.last.extra}</b> : null}
            </div>
          ) : null}
          <div className={`en-me${(me.hp ?? 0) <= 0 ? " down" : ""}`} style={lunge ? { transform: "translateY(-110px)" } : undefined}><Creature slug={me.slug} size={84} /></div>
          <div className="en-tag en-tag-fme">
            <span className="px en-name">{up(me.name)}</span>
            <Stats h={me} hp={me.hp} />
            <span className="en-heads">{(v.team ?? []).map((h) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={h.id} src={historikalSrc(h.slug)} alt={h.name} className={`${(h.hp ?? 0) <= 0 ? "ko" : ""}${h.id === v.pick ? " cur" : ""}`} />
            ))}</span>
          </div>

          {v.stage === "end" ? (
            <div className="en-end">
              {(() => { const res = (v.quiet ?? 0) >= 3 ? "draw" : (v.alive ?? 0) > 0 && !(v.their_alive ?? 0) ? "win" : !(v.alive ?? 0) && (v.their_alive ?? 0) > 0 ? "lose" : "draw";
                return <div className="px en-result" style={{ color: res === "win" ? "#f2b544" : res === "lose" ? "#8a7fb0" : "#fff" }}>{res === "win" ? "YOU WON!" : res === "lose" ? "YOU LOST" : "DRAW!"}</div>; })()}
              {(v.quiet ?? 0) >= 3 ? <div className="px en-say">NOBODY COULD LAND A HIT</div> : null}
              <div className="en-row2"><button type="button" className="px en-btn" onClick={() => act({ do: "rematch" })}>REMATCH</button><button type="button" className="px en-btn quiet" onClick={close}>CLOSE</button></div>
            </div>
          ) : v.stage === "replace" ? (
            v.need ? (
              <div className="en-bench"><span className="px en-say">WHO&apos;S NEXT?</span><div className="en-benchrow">{bench.map((h) => (
                <button key={h.id} type="button" onClick={() => { playClick(); act({ do: "next", item: h.id }); }} aria-label={h.name}><Creature slug={h.slug} size={44} /><span className="en-mini"><Stats h={h} hp={h.hp} k={2} /></span></button>
              ))}</div></div>
            ) : <div className="px en-status">{up(v.them.handle)} IS SENDING SOMEONE OUT<Dots /></div>
          ) : swapping ? (
            <div className="en-bench"><span className="px en-say">SWAP TO WHO? IT COSTS YOUR TURN</span><div className="en-benchrow">
              {bench.map((h) => (
                <button key={h.id} type="button" onClick={() => { setSwapping(false); act({ do: "move", swap: h.id }); }} aria-label={h.name}><Creature slug={h.slug} size={44} /><span className="en-mini"><Stats h={h} hp={h.hp} k={2} /></span></button>
              ))}
              <button type="button" className="px en-back" onClick={() => setSwapping(false)}>BACK</button>
            </div></div>
          ) : (
            <>
              <div className="en-moves">
                {(me.moves ?? []).map((m, i) => (
                  <button key={i} type="button" className={`px en-move${v.move?.m === i ? " on" : ""}`} disabled={!!v.move} onClick={() => { playClick(); act({ do: "move", m: i }); }} aria-label={`${m.name}, ${m.kind}`}>
                    <Pix rows={MOVE[m.kind]} k={3} fill="#fff" /><span>{up(m.name)}</span>
                  </button>
                ))}
                {bench.length ? (
                  <button type="button" className={`px en-move en-swap${v.move?.swap ? " on" : ""}`} disabled={!!v.move} onClick={() => setSwapping(true)} aria-label="Swap creature">
                    <Pix rows={SWAP} k={3} fill="#fff" /><span>SWAP</span>
                  </button>
                ) : null}
              </div>
              <div className="px en-status">{!v.move ? (v.their_moved ? `${up(v.them.handle)} HAS CHOSEN · YOUR MOVE` : "CHOOSE A MOVE") : <>WAITING ON {up(v.them.handle)}<Dots /></>}</div>
            </>
          )}
        </>
      ) : null}
    </Shell>
  );
}
