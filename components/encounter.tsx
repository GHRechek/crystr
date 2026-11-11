"use client";

import { useId, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { spriteUrl } from "@/lib/sprites";
import { createClient } from "@/lib/supabase/client";
import { QuestAskScreen, type QuestView } from "@/components/quest-ask";
import { Rays, playBuildUp, playClick, playFanfare, playLidOpen, playMythicDirge, playWhoosh } from "@/components/ask-scene";
import { ELEMENT_COLOR, HISTORIKAL, historikalSrc, type Element, type MoveKind, type Rarity } from "@/lib/historikals";
import { normalizeToken, tokenSrc } from "@/lib/token";
import { RarityGlow } from "@/components/rarity-glow";

/* Face to face, after a scan: a trade or a battle on both phones at once. The server holds the whole thing
   (supabase/migrations/20261108390000_encounters.sql) and tells each phone only its own side; this draws it.
   The host sits in the app's layout: it notices when someone starts one with you, opens the screen on both
   phones, and keeps it fresh about once a second while it is open. */

/** `types` (one or two, the first leads) is missing until you know it. `element` is the old single type: unused. */
export type HK = { id: number; slug: string; name: string; rarity: Rarity; element?: string; types?: Element[]; hearts: number; moves?: { name: string; kind: MoveKind; el: Element[]; charge?: boolean }[]; hp?: number; seen?: string[] };
type Side = { swap: boolean; from: string; to: string; move: string | null; hit: number; charge?: boolean; unleash?: Element[] | null };
type View = {
  ok: boolean; id: number; kind: "trade" | "battle"; stage: string; seq: number; me: "a" | "b";
  them: { handle: string; name: string | null }; off_by: "me" | "them" | null;
  mine?: HK[]; my_pick?: HK | null; their_pick?: HK | null; got?: HK | null;
  team?: HK[]; ready?: boolean; their_ready?: boolean; pick?: number | null; their_picked?: boolean; lock?: boolean; their_lock?: boolean;
  swapped?: boolean; turn?: number; quiet?: number; move?: { m?: number; swap?: number } | null; their_moved?: boolean; need?: boolean; their_need?: boolean;
  shadow?: string; left?: number; their_pips?: { ko: boolean; cur: boolean; slug?: string | null }[]; theirs?: HK; last?: { turn: number; line: string; extra: string; a: Side; b: Side } | null;
  /** Your creature charged last round: this round its charge comes out, whatever you do. */
  charging?: { item: number; m: number; el: Element[] } | null;
  /** Theirs is charging: next round it comes out with these elements. */
  their_charging?: { el: Element[] } | null;
  alive?: number; their_alive?: number;
  epic?: "token" | "historikal" | null; ask?: boolean; token_ok?: boolean; my_token?: unknown; want_epic?: boolean; lineup_ok?: boolean; lineup?: number[];
  stake?: { token?: boolean; item?: number } | null; their_stake?: { token?: unknown; item?: HK } | null;
  prize?: { won: boolean; kind: "token" | "historikal"; item: HK | null; token: unknown } | null;
};
/** A token's picture from its design. */
// eslint-disable-next-line @next/next/no-img-element
const TokenPic = ({ design, size }: { design: unknown; size: number }) => <img src={tokenSrc(normalizeToken(design))} alt="" width={size} height={size} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;
/** What an epic battle was won or lost for, from your side. */
function PrizeLine({ v }: { v: View }) {
  const p = v.prize;
  if (!p) return null;
  const them = up(v.them.handle);
  return (
    <div className="en-prize">
      {p.kind === "token" ? <TokenPic design={p.token} size={56} /> : p.item ? <Creature slug={p.item.slug} el={p.item.types?.[0]} size={64} /> : null}
      <span className="px">{p.won
        ? (p.kind === "token" ? `YOU WON ${them}'S PROOF` : `YOU WON ${up(p.item?.name ?? "")}`)
        : (p.kind === "token" ? `${them} WON A COPY OF YOUR PROOF` : `${them} TOOK ${up(p.item?.name ?? "")}`)}</span>
    </div>
  );
}

const supabase = () => createClient();

export type Stake = { token: true } | { item: number };
/** Why a battle couldn't start, in words. */
export const START_PROBLEM: Record<string, string> = {
  no_lineup: "Your lineup isn't ready: it needs four Historikals with hearts left.",
  proof_resting: "Your Proof is resting: it was lost in the last three months. Stake a Historikal instead.",
  bad_stake: "That Historikal can't be staked. Pick another.",
};
/** Start one with someone you have just scanned; their phone and yours both open it. A battle with a
 *  stake is an epic one. Returns null when it started, else why not. */
/** Why a quest ask couldn't start, in words. */
const QUEST_PROBLEM: Record<string, string> = {
  wrong_kind: "They aren't the kind of person this quest asks for.",
  have_it: "You have this one already.",
  not_picked: "Pick this main quest first.",
  already: "That one already counted with them.",
  bad_person: "That's you. Scan someone else's code.",
  bad_badge: "That quest can't be done with someone.",
};
/** Ask someone, face to face, to say a quest happened with them: it opens on both phones. */
export async function startQuestAsk(slug: string, otherId: string): Promise<string | null> {
  const { data } = await supabase().rpc("cr_quest_ask", { p_slug: slug, p_other: otherId });
  const r = data as { ok: boolean; id?: number; code?: string } | null;
  if (r?.ok && r.id) { window.dispatchEvent(new CustomEvent("crystr:encounter", { detail: { id: r.id, kind: "quest" } })); return null; }
  return QUEST_PROBLEM[r?.code ?? ""] ?? "That didn't start. Try again.";
}

export async function startEncounter(kind: "trade" | "battle", otherId: string, stake?: Stake): Promise<string | null> {
  const { data } = await supabase().rpc("cr_enc_start", stake ? { p_kind: kind, p_other: otherId, p_stake: stake } : { p_kind: kind, p_other: otherId });
  const r = data as { ok: boolean; id?: number; code?: string } | null;
  if (r?.ok && r.id) { window.dispatchEvent(new CustomEvent("crystr:encounter", { detail: { id: r.id, kind } })); return null; }
  return START_PROBLEM[r?.code ?? ""] ?? "That didn't start. Try again.";
}

export function EncounterHost() {
  const [id, setId] = useState<number | null>(null);
  const [kind, setKind] = useState<string>("trade");
  const [view, setView] = useState<View | null>(null);
  const [quest, setQuest] = useState<QuestView | null>(null);
  const closed = useRef(new Set<number>());

  // Is anyone starting one with me? Checked every few seconds while the page is in front of you.
  useEffect(() => {
    const open = (n: number, k: string) => { if (!closed.current.has(n)) { setKind(k); setId(n); } };
    const onStart = (e: Event) => { const d = (e as CustomEvent<{ id: number; kind: string }>).detail; open(d.id, d.kind); };
    window.addEventListener("crystr:encounter", onStart);
    const look = async () => {
      if (document.hidden) return;
      const { data } = await supabase().rpc("cr_enc_mine");
      const r = data as { id: number; kind: string } | null;
      if (r?.id) open(r.id, r.kind);
    };
    look();
    const t = window.setInterval(look, 3500);
    return () => { window.removeEventListener("crystr:encounter", onStart); window.clearInterval(t); };
  }, []);

  const refresh = useCallback(async () => {
    if (!id) return;
    if (kind === "quest") {
      const { data } = await supabase().rpc("cr_quest_view", { p_id: id });
      const q = data as QuestView | null;
      if (q?.ok) setQuest((old) => (old && old.id === q.id && old.seq === q.seq ? old : q));
      return;
    }
    const { data } = await supabase().rpc("cr_enc_view", { p_id: id });
    const v = data as View | null;
    if (v?.ok) setView((old) => (old && old.id === v.id && old.seq === v.seq && v.stage !== "shadow" ? old : v));
  }, [id, kind]);

  useEffect(() => {
    if (!id) return;
    refresh();
    const t = window.setInterval(refresh, 900);
    return () => window.clearInterval(t);
  }, [id, refresh]);

  const act = useCallback(async (a: Record<string, unknown>) => {
    if (!id) return null;
    const { data } = await supabase().rpc("cr_enc_act", { p_id: id, p_act: a });
    await refresh();
    return data as { ok: boolean; code?: string } | null;
  }, [id, refresh]);

  const close = useCallback(() => {
    if (id) closed.current.add(id);
    setId(null);
    setView(null);
    setQuest(null);
  }, [id]);
  const answer = useCallback(async (yes: boolean) => {
    if (!id) return;
    await supabase().rpc("cr_quest_answer", { p_id: id, p_yes: yes });
    await refresh();
  }, [id, refresh]);
  const end = useCallback(async () => {
    if (!id) return;
    await supabase().rpc("cr_quest_end", { p_id: id });
  }, [id]);

  if (id && kind === "quest") return quest && quest.id === id ? <QuestAskScreen v={quest} close={close} answer={answer} end={end} /> : null;
  if (!id || !view || view.id !== id) return null;
  return view.kind === "trade" ? <TradeScreen v={view} act={act} close={close} /> : <BattleScreen v={view} act={act} close={close} />;
}

/* ---------------------------------------------------------------- pieces */

const up = (s: string) => s.toUpperCase();

/** The colour this far (0..1) from hex `a` to hex `b`: a pixel gradient, one colour per column, with no SVG gradient to go wrong. */
function mix(a: string, b: string, t: number) {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = (i: number) => Math.round(n(a, i) + (n(b, i) - n(a, i)) * t).toString(16).padStart(2, "0");
  return `#${c(0)}${c(1)}${c(2)}`;
}
/** A little pixel picture from rows of # and . (and o for a dark outline cell). */
function Pix({ rows, k, fill, dim, grad, fill2, to }: { rows: string[]; k: number; fill: string; dim?: boolean; /** Filled with the CRYSTR gradient instead (defined inside, so every browser finds it). */ grad?: boolean; /** The right half in this colour instead: a move with two elements. */ fill2?: string; /** A gradient across it from `fill` to this colour: a creature's hearts, in both its types. */ to?: string }) {
  const id = `g${useId().replace(/:/g, "")}`;
  const half = Math.ceil(rows[0].length / 2);
  return (
    <svg width={rows[0].length * k} height={rows.length * k} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill={grad ? `url(#${id})` : fill} aria-hidden opacity={dim ? 0.18 : 1} style={{ flex: "none", filter: `drop-shadow(${Math.max(1, Math.round(k))}px ${Math.max(1, Math.round(k))}px 0 #0a0616)` }}>
      {grad ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e0398a" />
            <stop offset="0.52" stopColor="#9184d9" />
            <stop offset="1" stopColor="#4c7df0" />
          </linearGradient>
        </defs>
      ) : null}
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={grad ? undefined : to ? mix(fill, to, x / (rows[0].length - 1)) : fill2 && x >= half ? fill2 : undefined} /> : c === "o" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#0a0616" /> : null)))}
    </svg>
  );
}
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
/** A lost heart: just its outline. */
const HEART_LOST = [".##.##.", "#..#..#", "#.....#", ".#...#.", "..#.#..", "...#..."];
/** Half a heart: the left half full, the right an outline. */
const HEART_HALF = [".##.##.", "####..#", "####..#", ".###.#.", "..##...", "...#..."];
const QMARK = [".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."];
const SWORDS = ["#.......#", ".#.....#.", "..#...#..", "...#.#...", "....#....", "...#.#...", ".##...##.", ".##...##.", "#.......#"];
const TRADE_ARROWS = ["......#..", ".......#.", "#########", ".......#.", "......#..", ".........", "..#......", ".#.......", "#########", ".#.......", "..#......"];
const UNDO = ["..#.......", ".##.......", "#######...", ".##....#..", "..#.....#.", ".........#", ".........#", "........#.", "...#####.."];
const SWAP = ["...#...", "....#..", "#######", "....#..", "..#.#..", ".#.....", "#######"];

const BOLT = ["..##.", ".##..", "####.", "..##.", ".#...", "#...."];
/** What the three kinds of move are called: pierce through soft, soft covers hard, hard breaks pierce. */
export const KIND_NAME: Record<MoveKind, string> = { sword: "PIERCE", spell: "SOFT", armor: "HARD" };
/** Pixels across for an icon from the pack (16px art) at the old 7-cell step k: whole multiples where it can. */
const packPx = (k: number) => (k >= 3 ? 24 : k >= 1.5 ? 16 : 12);
/** One of the pack's 16px icons, as an image. */
function PackImg({ src, px, style }: { src: string; px: number; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={px} height={px} draggable={false} style={{ display: "block", imageRendering: "pixelated", flex: "none", ...style }} />;
}

/** A move's kind from the icon pack (pierce a sword, soft an open hand, hard a fist) hue-shifted onto its element's
 *  colour, the right half in the second element's when it has two. A charge adds a bolt. */
export function MoveIcon({ kind, k = 2, fill: _fill, el, charge }: { kind: MoveKind; k?: number; /** Unused now the icons are pictures; kept for callers. */ fill?: string; el?: Element[]; charge?: boolean }) {
  const px = packPx(k);
  const src = (e?: Element) => `/icons/move-${kind}${e ? `-${e}` : ""}.png`;
  const base = el?.[1] ? (
    <span style={{ position: "relative", display: "inline-block", width: px, height: px, flex: "none" }}>
      <PackImg src={src(el[0])} px={px} />
      <PackImg src={src(el[1])} px={px} style={{ position: "absolute", left: 0, top: 0, clipPath: "inset(0 0 0 50%)" }} />
    </span>
  ) : <PackImg src={src(el?.[0])} px={px} />;
  if (!charge) return base;
  return <span style={{ display: "inline-flex", gap: Math.max(1, Math.round(k)), alignItems: "center" }}>{base}<Pix rows={BOLT} k={k} fill="#fff" /></span>;
}

/** The charging aura: flakes in the charge's element colour rising off the creature, most behind it, a few in front. */
export function ChargeAura({ el, size, children }: { el: Element[]; size: number; children: React.ReactNode }) {
  const cols = el.map((t) => ELEMENT_COLOR[t]);
  const flakes = useMemo(() => {
    let a = 9;
    const r = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
    return Array.from({ length: 70 }, (_, i) => { const ang = r() * Math.PI * 2, rr = 0.5 + r() * 0.5; return { x: 0.5 + Math.cos(ang) * 0.42 * rr, y: 0.62 + Math.sin(ang) * 0.36 * rr, sz: [3, 3, 4, 4, 5][Math.floor(r() * 5)] * (size / 96), front: i >= 58, dx: (r() * 20 - 10) * (size / 96), h: (40 + r() * 50) * (size / 96), d: -(r() * 1.6), dur: 0.9 + r() * 0.8 }; });
  }, [size]);
  return (
    <span className="en-aura" style={{ width: size, height: size }}>
      {flakes.map((f, i) => <i key={i} style={{ left: f.x * size, top: f.y * size, width: f.sz, height: f.sz, background: cols[i % cols.length] ?? "#fff", zIndex: f.front ? 3 : 1, ["--dx" as string]: `${f.dx}px`, ["--h" as string]: `-${f.h}px`, animationDelay: `${f.d}s`, animationDuration: `${f.dur}s` }} />)}
      <span style={{ position: "relative", zIndex: 2, display: "block", lineHeight: 0 }}>{children}</span>
    </span>
  );
}

/** One type's icon, from the pack. */
export function TypeIcon({ type, k = 2, grad: _grad }: { type: Element; k?: number; /** Unused now the icons are pictures; kept for callers. */ grad?: boolean }) {
  return <PackImg src={`/icons/type-${type}.png`} px={packPx(k)} />;
}

/** Its types (each in its colour, or ? until you know them) then white hearts. */
export function Stats({ h, hp, k = 3, known = true, only, fav }: { h: HK; hp?: number; k?: number; known?: boolean; only?: "type" | "hearts"; /** Kept for callers; hearts no longer change for a favourite. */ fav?: boolean }) {
  const left = hp ?? h.hearts;
  return (
    <span className="en-stats">
      {/* Only its primary type up front; its hearts carry both. */}
      {only === "hearts" ? null : known && h.types?.length ? <TypeIcon type={h.types[0]} k={k} /> : <Pix rows={QMARK} k={k} fill="#d2cefd" />}
      {/* Each heart a gradient of its two types, primary to secondary; a single type's hearts are solid in that colour. */}
      {only === "type" ? null : Array.from({ length: h.hearts }, (_, i) => <Pix key={i} rows={i + 1 <= left ? HEART : i < left ? HEART_HALF : HEART_LOST} k={k} fill={h.types?.[0] ? ELEMENT_COLOR[h.types[0]] : "#fff"} to={h.types?.[1] ? ELEMENT_COLOR[h.types[1]] : undefined} />)}
    </span>
  );
}

/** A creature, idling between its two frames, in the colour of its type (el) if it rolls one. */
export function Creature({ slug, size, shadow, ko, el, aura }: { slug: string; size: number; shadow?: boolean; ko?: boolean; el?: Element; /** A silhouette that still wears its ring and flakes: a mythic's entrance. */ aura?: boolean }) {
  const [f, setF] = useState<1 | 2>(1);
  useEffect(() => {
    if (shadow) return;
    const t = window.setInterval(() => setF((x) => (x === 1 ? 2 : 1)), 500);
    return () => window.clearInterval(t);
  }, [shadow]);
  // Knocked out: greyed out and still, but solid (not see-through).
  // eslint-disable-next-line @next/next/no-img-element
  if (ko) return <img className="en-ko-sil" src={historikalSrc(slug, 1, el)} alt="" width={size} height={size} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none", filter: "grayscale(1) brightness(.6)" }} />;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={shadow ? spriteUrl(`creatures/${slug}-s.png`) ?? `/creatures/${slug}-s.png` : historikalSrc(slug, f, el)} alt="" width={size} height={size} draggable={false} style={{ display: "block", imageRendering: "pixelated", pointerEvents: "none" }} />;
  // Flyers and floaters bob gently.
  // The ring goes inside the bob, not around it: Safari drops a filter on the parent of an animated child.
  const ringed = <RarityGlow slug={slug} size={size} src={shadow ? spriteUrl(`creatures/${slug}-s.png`) ?? `/creatures/${slug}-s.png` : historikalSrc(slug, f, el)}>{img}</RarityGlow>;
  if (shadow) return aura ? ringed : img;
  return HISTORIKAL.get(slug)?.hover ? <span className="hk-hover">{ringed}</span> : ringed;
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

/** The pinwheel's colours: the trade's blues, the battle's purples, gold for an epic battle, and blood reds while
 *  a mythic stands on the other side. */
const PALETTE = { trade: { bg: [50, 86, 190], ray: [76, 125, 240] }, plain: { bg: [36, 14, 50], ray: [88, 22, 66] }, epic: { bg: [40, 25, 4], ray: [110, 74, 12] }, mythic: { bg: [78, 13, 20], ray: [32, 5, 9] } };
function Shell({ kind, children, dim, epic, mythic }: { kind: "trade" | "battle"; children: React.ReactNode; dim?: "on" | "after"; epic?: boolean; mythic?: boolean }) {
  const pal = PALETTE[kind === "trade" ? "trade" : mythic ? "mythic" : epic ? "epic" : "plain"];
  return (
    <div role="dialog" aria-label={kind === "trade" ? "Trade" : "Battle"} className={`en-scene en-${kind}`}>
      <Rays bg={pal.bg} ray={pal.ray} viaBlack={!!mythic} />
      <div className={`en-dim${dim ? ` is-${dim}` : ""}`} aria-hidden />
      {children}
    </div>
  );
}

/** A mythic's health in the fight: one bar that pours in from the left like a liquid when it first shows, then
 *  follows its hearts, sinking smoothly when it is hit. */
function BossBar({ hp, hearts }: { hp: number; hearts: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = useRef(0);   // the share of the bar drawn full right now
  const target = Math.max(0, Math.min(1, hearts ? hp / hearts : 0));
  useEffect(() => {
    const c = ref.current, g = c?.getContext("2d");
    if (!c || !g) return;
    c.width = 100; c.height = 4;
    const start = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const pour = Math.min(1, t / 1.3), ease = 1 - Math.pow(1 - pour, 3);
      // Pouring in, the bar heads for its true level; afterwards it slides towards it over half a second.
      const goal = pour < 1 ? ease * target : target;
      shown.current = pour < 1 ? goal : shown.current + (goal - shown.current) * 0.18;
      const w = shown.current * 100;
      g.clearRect(0, 0, 100, 4);
      for (let y = 0; y < 4; y++) {
        const slosh = pour < 1 ? Math.round(Math.sin(t * 14 + y * 1.9) * 2 + (y % 2 ? 1 : 0)) : 0;
        const ww = Math.max(0, Math.min(100, Math.round(w) + slosh));
        g.fillStyle = y === 0 ? "#d8323c" : "#a8161f"; g.fillRect(0, y, ww, 1);
        if (pour < 1 && ww < 100) { g.fillStyle = "#e85a62"; g.fillRect(ww - 1, y, 1, 1); }
      }
      if (pour < 1 || Math.abs(goal - shown.current) > 0.002) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <span className="en-bossbar" role="img" aria-label={`${hp} of ${hearts} hearts`}><canvas ref={ref} /></span>;
}

function Closed({ v, close, what }: { v: View; close: () => void; what: string }) {
  return (
    <div className="en-closed">
      <div className="px">
        <b>{what} CALLED OFF</b>
        {v.off_by === "me" ? "You walked away." : v.off_by === "them" ? `${up(v.them.handle)} walked away.` : "Something else started."}
        <PrizeLine v={v} />
        <button type="button" className="px en-btn" onClick={close}>CLOSE</button>
      </div>
    </div>
  );
}

type Act = (a: Record<string, unknown>) => unknown;
function Invite({ v, act, kind }: { v: View; act: Act; kind: "trade" | "battle" }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [staking, setStaking] = useState(false);
  const icon = <div className="en-icon" style={{ background: kind === "trade" ? "#c42c76" : v.want_epic ? "#8a5a0c" : "#5a1f6e" }}><Pix rows={kind === "trade" ? TRADE_ARROWS : SWORDS} k={6} fill="#fff" /></div>;
  const yes = async (stake?: Stake) => {
    playClick();
    const r = (await act(stake ? { do: "yes", stake } : { do: "yes" })) as { ok: boolean; code?: string } | null;
    if (r && !r.ok) setProblem(r.code === "their_lineup" ? `${up(v.them.handle)}'s lineup isn't ready any more.` : START_PROBLEM[r.code ?? ""] ?? "That didn't work. Try again.");
  };
  if (v.me === "b") {
    // A battle needs your lineup: four Historikals with hearts left, on show in your badge display.
    if (kind === "battle" && v.lineup_ok === false) {
      return (
        <>
          <div className="px en-q">{up(v.them.handle)} WANTS TO {v.want_epic ? "EPIC " : ""}BATTLE</div>
          <div className="px en-big">{icon}YOUR LINEUP<b>ISN&apos;T READY</b>PUT 4 HISTORIKALS WITH HEARTS IN YOUR BADGE DISPLAY</div>
          <div className="en-invite">
            <a href="/me?badges=1" className="px" style={{ background: "#5a1f6e", textDecoration: "none", textAlign: "center" }} onClick={() => act({ do: "no" })}>EDIT MY LINEUP</a>
            <button type="button" className="px" style={{ background: "#c42c76" }} onClick={() => { playWhoosh(); act({ do: "no" }); }}>NOT NOW</button>
          </div>
        </>
      );
    }
    // An epic one: they've put something up. Answer it with your Proof or a Historikal, or just fight.
    if (kind === "battle" && v.want_epic) {
      const theirs = v.their_stake;
      if (staking) {
        return (
          <>
            <div className="px en-q">STAKE ONE OF YOURS</div>
            {/* Your lineup, in its order. */}
            <Shelf items={(v.lineup ?? []).map((id) => (v.mine ?? []).find((h) => h.id === id)).filter((h): h is HK => !!h)} label="STAKE ONE OF YOUR LINEUP" onPick={(h) => yes({ item: h.id })} />
            <div className="en-bottom"><button type="button" className="px en-btn quiet" onClick={() => setStaking(false)}>BACK</button></div>
          </>
        );
      }
      return (
        <>
          <div className="px en-q">★ {up(v.them.handle)} WANTS AN EPIC BATTLE ★</div>
          <div className="en-mid">{theirs?.item ? <Creature slug={theirs.item.slug} el={theirs.item.types?.[0]} size={102} /> : theirs?.token ? <TokenPic design={theirs.token} size={96} /> : null}</div>
          <div className="px en-midlabel">THEY PUT UP<b>{theirs?.item ? up(theirs.item.name) : "THEIR PROOF"}</b></div>
          {problem ? <div className="px en-say" style={{ position: "absolute", left: 16, right: 16, bottom: "calc(300px + env(safe-area-inset-bottom))", textAlign: "center", color: "#ffb3cf" }}>{problem}</div> : null}
          <div className="en-invite" style={{ bottom: "calc(36px + env(safe-area-inset-bottom))" }}>
            {v.token_ok && v.my_token ? <button type="button" className="px" style={{ background: "#8a5a0c" }} onClick={() => yes({ token: true })}>PUT UP MY PROOF</button> : null}
            <button type="button" className="px" style={{ background: "#8a5a0c" }} onClick={() => setStaking(true)}>STAKE A HISTORIKAL</button>
            <button type="button" className="px" style={{ background: "#5a1f6e" }} onClick={() => yes()}>JUST BATTLE</button>
            <button type="button" className="px" style={{ background: "#c42c76" }} onClick={() => { playWhoosh(); act({ do: "no" }); }}>NOT NOW</button>
          </div>
        </>
      );
    }
    return (
      <>
        <div className="px en-q">{up(v.them.handle)} WANTS TO {kind === "trade" ? "TRADE" : "BATTLE"}</div>
        <div className="px en-big">{icon}{kind === "trade" ? "TRADE WITH" : "BATTLE"}<b>{up(v.them.handle)}?</b></div>
        {problem ? <div className="px en-say" style={{ position: "absolute", left: 16, right: 16, bottom: "calc(230px + env(safe-area-inset-bottom))", textAlign: "center", color: "#ffb3cf" }}>{problem}</div> : null}
        <div className="en-invite">
          <button type="button" className="px" style={{ background: kind === "trade" ? "#3a64cc" : "#5a1f6e" }} onClick={() => yes()}>{kind === "trade" ? "YES, LET'S TRADE" : "YES, LET'S FIGHT"}</button>
          <button type="button" className="px" style={{ background: "#c42c76" }} onClick={() => { playWhoosh(); act({ do: "no" }); }}>NOT NOW</button>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="px en-q">{kind === "trade" ? "ASKING" : v.want_epic ? "★ EPIC BATTLE ★ CHALLENGING" : "CHALLENGING"} {up(v.them.handle)}<Dots /></div>
      <div className="px en-big">{icon}WAITING ON<b>{up(v.them.handle)}</b>{v.want_epic ? (v.stake?.token ? "YOUR PROOF IS UP" : "YOU STAKED A HISTORIKAL") : ""}</div>
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
            <Creature slug={h.slug} el={h.types?.[0]} size={64} />
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
          <div className="en-mid" ref={mid}>{theirs ? <Creature slug={theirs.slug} el={theirs.types?.[0]} size={102} /> : <div className="px en-qmark">?</div>}</div>
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
                <div className="en-float"><Creature slug={mine.slug} el={mine.types?.[0]} size={72} /></div>
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
          <div className="en-mid en-rise"><Creature slug={v.got.slug} el={v.got.types?.[0]} size={102} /></div>
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
  const [swapping, setSwapping] = useState(false);
  // Charged last round: this round is spoken for, and the move goes in on its own.
  const sentCharge = useRef<number | null>(null);
  useEffect(() => {
    if (v.stage !== "fight" || !v.charging || v.move) return;
    if (sentCharge.current === v.turn) return;
    sentCharge.current = v.turn ?? null;
    act({ do: "move", m: v.charging.m });
  }, [v.stage, v.charging, v.move, v.turn]);   // eslint-disable-line react-hooks/exhaustive-deps
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

  // A mythic on their side: the screen goes to black with it in silhouette, wearing its aura, then comes back
  // in blood reds with the creature shown; its hearts are a bar. Once per mythic that steps out.
  const theirIsMythic = !!v.theirs && HISTORIKAL.get(v.theirs.slug)?.rarity === "legendary";
  const theirMythic = fighting && theirIsMythic && (v.theirs!.hp ?? 0) > 0;   // standing: the reds and the aura
  // "fade": the screen is going dark and nothing of theirs shows yet; "dark": the silhouette with its aura; "shown": the creature.
  const [entrance, setEntrance] = useState<"fade" | "dark" | "shown" | null>(null);
  const entered = useRef<string | null>(null);
  useEffect(() => {
    if (!theirMythic || !v.theirs) { if (!theirMythic) entered.current = null; return; }
    if (entered.current === v.theirs.slug) return;
    entered.current = v.theirs.slug;
    setEntrance("fade"); playMythicDirge();
    const t1 = window.setTimeout(() => setEntrance("dark"), 800), t2 = window.setTimeout(() => setEntrance("shown"), 2600);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [theirMythic, v.theirs?.slug]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell kind="battle" epic={!!v.epic || !!v.want_epic} mythic={theirMythic} dim={revealing ? "on" : v.stage === "end" ? "after" : undefined}>
      {v.stage === "off" ? <Closed v={v} close={close} what="BATTLE" /> : null}
      {v.stage === "invite" ? <Invite v={v} act={act} kind="battle" /> : null}

      {/* The team is your lineup now: no picking it here. */}

      {v.stage === "stake" ? (
        v.ask ? (
          <>
            <div className="px en-q">{up(v.them.handle)} CAN&apos;T PUT A PROOF UP</div>
            {v.their_stake?.item ? <div className="en-mid"><Creature slug={v.their_stake.item.slug} el={v.their_stake.item.types?.[0]} size={102} /></div> : null}
            {v.their_stake?.item ? <div className="px en-midlabel">THEY STAKED<b>{up(v.their_stake.item.name)}</b><Stats h={v.their_stake.item} k={2} /></div> : null}
            <Shelf items={(v.lineup ?? []).map((id) => (v.mine ?? []).find((h) => h.id === id)).filter((h): h is HK => !!h)} label="STAKE ONE OF YOUR LINEUP FOR AN EPIC FIGHT?" onPick={(h) => act({ do: "answer", stake: { item: h.id } })} />
            <div className="en-bottom"><button type="button" className="px en-btn quiet" onClick={() => act({ do: "answer" })}>NO, JUST FIGHT</button></div>
          </>
        ) : (
          <><div className="px en-q">{up(v.them.handle)} IS DECIDING<Dots /></div>
          <div className="px en-big">YOU STAKED<b>{up((v.mine ?? []).find((h) => h.id === v.stake?.item)?.name ?? "A HISTORIKAL")}</b>AGAINST THEIR PROOF</div></>
        )
      ) : null}

      {v.epic && ["pick", "shadow", "fight", "replace"].includes(v.stage) ? <div className="px en-epic">★ EPIC BATTLE ★</div> : null}

      {v.stage === "pick" ? (
        <>
          <div className="px en-q">{v.their_lock ? `${up(v.them.handle)} IS READY` : v.their_picked ? `${up(v.them.handle)} HAS PICKED` : <>{up(v.them.handle)} IS CHOOSING<Dots /></>}</div>
          <div className="en-mid" ref={mid}><div className="px en-qmark">?</div></div>
          {!me ? (
            <><Shelf items={v.team ?? []} label="WHO GOES FIRST?" onPick={(h) => act({ do: "pick", item: h.id })} /><div className="en-bottom"><Nevermind onClick={() => act({ do: "leave" })} /></div></>
          ) : (
            <>
              <div className={`en-mine en-fighter${drag.held ? " held" : ""}`} {...drag.bind} style={drag.style} aria-label={`Your fighter, ${me.name}. Drag it up into the question mark to lock in, or back down to pick again.`}>
                <div className={v.lock ? "" : "en-float"}><Creature slug={me.slug} el={me.types?.[0]} size={96} /></div>
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
          <div className="en-me-sm"><Creature slug={me.slug} el={me.types?.[0]} size={84} /></div>
          <div className="en-tag en-tag-sm"><span className="px en-name">{up(me.name)}</span><Stats h={me} /></div>
          <div className="en-bench">
            {v.swapped ? <span className="px en-say">SWAPPED · THEY STILL SEE YOUR OLD SHADOW</span> : (
              <><span className="px en-say">SWAP? THEY WON&apos;T SEE IT</span>
              <div className="en-benchrow">{(v.team ?? []).filter((h) => h.id !== v.pick).map((h) => (
                <button key={h.id} type="button" onClick={() => { playClick(); act({ do: "swapin", item: h.id }); }} aria-label={`Swap to ${h.name}`}><Creature slug={h.slug} el={h.types?.[0]} size={48} /></button>
              ))}</div></>
            )}
          </div>
        </>
      ) : null}

      {revealing ? <div className="px en-q">BATTLE!</div> : null}

      {fighting && me && v.theirs ? (
        <>
          <div className="px en-q">{v.stage === "end" ? "" : v.stage === "replace" ? "KNOCKED OUT!" : v.their_charging ? `${up(v.theirs.name)} IS CHARGING UP, GET READY!` : `TURN ${v.turn}`}</div>
          {/* What they have left to send out, as silhouettes, above the one that is up. */}
          {(v.their_pips ?? []).some((p) => p.slug) ? (
            <div className="en-left" aria-label="Still to come">
              {(v.their_pips ?? []).filter((p) => p.slug).map((p, i) => <Creature key={i} slug={p.slug!} size={34} shadow />)}
            </div>
          ) : null}
          <div className={`en-them${(v.theirs.hp ?? 0) <= 0 ? " down" : ""}`} style={lunge ? { transform: "translateY(110px)" } : undefined}>
            {theirMythic && entrance === "fade" ? null : theirMythic && entrance === "dark" ? <Creature slug={v.theirs.slug} size={102} shadow aura /> : v.their_charging && (v.theirs.hp ?? 0) > 0 ? <ChargeAura el={v.their_charging.el} size={102}><Creature slug={v.theirs.slug} el={v.theirs.types?.[0]} size={102} /></ChargeAura> : <Creature slug={v.theirs.slug} el={v.theirs.types?.[0]} size={102} ko={(v.theirs.hp ?? 0) <= 0} />}
          </div>
          <div className="en-tag en-tag-them" style={theirMythic && entrance === "fade" ? { visibility: "hidden" } : undefined}>
            {theirIsMythic ? <span className="px en-mythtag">MYTHIC</span> : null}
            <span className={`px en-name${theirIsMythic ? " en-mythname" : ""}`}>{up(v.theirs.name)}</span>
            {theirIsMythic ? (entrance === "shown" || !theirMythic ? <BossBar hp={v.theirs.hp ?? v.theirs.hearts} hearts={v.theirs.hearts} /> : <span className="en-bossbar" aria-hidden />)
              : <Stats h={v.theirs} hp={v.theirs.hp} only="hearts" />}
            <span className="px en-seen">{v.theirs.seen?.length ? `SEEN: ${v.theirs.seen.map(up).join(" · ")}` : "MOVES: ???"}</span>
          </div>
          {v.last && v.stage !== "end" ? (
            <div className="px en-say-big" key={v.last.turn}>
              <span className="en-vs">{v.last[mySide].swap ? `${up(v.last[mySide].from)} → ${up(v.last[mySide].to)}` : v.last[mySide].charge ? "CHARGING UP" : v.last[mySide].unleash ? `CHARGED ${up(v.last[mySide].move ?? "")}` : up(v.last[mySide].move ?? "")} <i>vs</i> {v.last[theirSide].swap ? "SWAP" : v.last[theirSide].charge ? "CHARGING UP" : v.last[theirSide].unleash ? `CHARGED ${up(v.last[theirSide].move ?? "")}` : up(v.last[theirSide].move ?? "")}</span>
              <span>{v.last.line}</span>{v.last.extra ? <b>{v.last.extra}</b> : null}
            </div>
          ) : null}
          <div className={`en-me${(me.hp ?? 0) <= 0 ? " down" : ""}`} style={lunge ? { transform: "translateY(-110px)" } : undefined}>{v.charging && (me.hp ?? 0) > 0 ? <ChargeAura el={v.charging.el} size={84}><Creature slug={me.slug} el={me.types?.[0]} size={84} /></ChargeAura> : <Creature slug={me.slug} el={me.types?.[0]} size={84} ko={(me.hp ?? 0) <= 0} />}</div>
          <div className="en-tag en-tag-fme">
            <span className="px en-name">{up(me.name)}</span>
            <Stats h={me} hp={me.hp} />
          </div>

          {v.stage === "end" ? (
            <div className="en-end">
              {(() => { const res = (v.quiet ?? 0) >= 3 ? "draw" : (v.alive ?? 0) > 0 && !(v.their_alive ?? 0) ? "win" : !(v.alive ?? 0) && (v.their_alive ?? 0) > 0 ? "lose" : "draw";
                return <div className="px en-result" style={{ color: res === "win" ? "#f2b544" : res === "lose" ? "#8a7fb0" : "#fff" }}>{res === "win" ? "YOU WON!" : res === "lose" ? "YOU LOST" : "DRAW!"}</div>; })()}
              {(v.quiet ?? 0) >= 3 ? <div className="px en-say">NOBODY COULD LAND A HIT</div> : null}
              <PrizeLine v={v} />
              <div className="en-row2"><button type="button" className="px en-btn" onClick={() => act({ do: "rematch" })}>REMATCH</button><button type="button" className="px en-btn quiet" onClick={close}>CLOSE</button></div>
            </div>
          ) : v.stage === "replace" ? (
            v.need ? (
              <div className="en-bench"><span className="px en-say">WHO&apos;S NEXT?</span><div className="en-benchrow">{bench.map((h) => (
                <button key={h.id} type="button" onClick={() => { playClick(); act({ do: "next", item: h.id }); }} aria-label={h.name}><Creature slug={h.slug} el={h.types?.[0]} size={44} /><span className="en-mini"><Stats h={h} hp={h.hp} k={2} /></span></button>
              ))}</div></div>
            ) : <div className="px en-status">{up(v.them.handle)} IS SENDING SOMEONE OUT<Dots /></div>
          ) : swapping ? (
            <div className="en-bench"><span className="px en-say">SWAP TO WHO? IT COSTS YOUR TURN</span><div className="en-benchrow">
              {bench.map((h) => (
                <button key={h.id} type="button" onClick={() => { setSwapping(false); act({ do: "move", swap: h.id }); }} aria-label={h.name}><Creature slug={h.slug} el={h.types?.[0]} size={44} /><span className="en-mini"><Stats h={h} hp={h.hp} k={2} /></span></button>
              ))}
              <button type="button" className="px en-back" onClick={() => setSwapping(false)}>BACK</button>
            </div></div>
          ) : v.charging ? (
            <div className="px en-status" style={{ color: ELEMENT_COLOR[v.charging.el[0]] }}>CHARGING {v.charging.el.map(up).join(" & ")}… IT COMES OUT THIS ROUND{v.move ? <><br />WAITING ON {up(v.them.handle)}<Dots /></> : null}</div>
          ) : (
            <>
              <div className="en-moves">
                {(me.moves ?? []).map((m, i) => (
                  <button key={i} type="button" className={`px en-move${v.move?.m === i ? " on" : ""}`} disabled={!!v.move} onClick={() => { playClick(); act({ do: "move", m: i }); }} aria-label={`${m.name}, ${m.kind}, ${m.el.join(" and ")}${m.charge ? ", a charge" : ""}`}>
                    <MoveIcon kind={m.kind} k={3} el={m.el} charge={m.charge} /><span>{up(m.name)}</span>{m.charge ? <small style={{ color: "#ffe38b", fontSize: 7, letterSpacing: ".06em" }}>CHARGE</small> : null}
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
