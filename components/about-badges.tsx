"use client";

import { QrScanner } from "@/components/qr-scanner";
import { useEffect, useRef, useState, useId } from "react";
import Link from "next/link";
import { TokenImage } from "@/components/badges";
import { BadgeFace } from "@/components/badge-chooser";
import { BadgeViewer } from "@/components/badge-viewer";
import { HkMenu } from "@/components/hk-menu";
import { BadgeTip } from "@/components/badge-tip";
import { SHOW_MAX, type ShownBadge } from "@/lib/badges";
import type { Stake } from "@/components/encounter";
import { DrawScene, type DrawKind } from "@/components/draw-scene";
import { HistorikalCard } from "@/components/historikal-card";
import { useRouter } from "next/navigation";

/** The strip under the About Me text: the person's token (passed in as children), then up to five
 *  badges of their choosing, smaller. Tap a badge for its name and what it took. On your own page
 *  a small + (or the last empty slot) opens the choice of which to show. */
export function AboutBadges({
  children,
  shown,
  earned,
  tradable,
  aside,
  editable,
  noPen,
  tradeHref,
  tradeCount,
  scan,
  draws,
  compact,
  openAtStart,
  token,
}: {
  children?: React.ReactNode;
  shown: ShownBadge[];
  /** Everything they have, for the full-screen look: earned, and tradable. */
  earned: ShownBadge[];
  tradable: ShownBadge[];
  aside?: React.ReactNode;
  /** No pen or eye: the page puts its own way to the full list beside this row. */
  noPen?: boolean;
  /** A trade icon at the end of the row, to the trade menu, with how many are waiting. */
  tradeHref?: string;
  tradeCount?: number;
  /** The trade icon opens the camera to scan someone's code instead of going to the trade menu. */
  scan?: boolean;
  /** Draws waiting to be opened: FIND ONE! (normal) and SUMMON ONE! (main). */
  draws?: { normal: number; main: number };
  /** The slim version that sits beside the portrait: a small trade icon and a cog at the end. */
  compact?: boolean;
  /** Open the full list of badges, to choose which to show, as soon as it appears. */
  openAtStart?: boolean;
  /** The person's token, always the first badge in the row. `design` is null when they have none yet. */
  token?: { design: unknown | null; href?: string; title?: string; line?: string; actionLabel?: string };
  editable?: boolean;
}) {
  const [tip, setTip] = useState<{ key: string; x: number; top: number } | null>(null);
  const [choosing, setChoosing] = useState(!!openAtStart && !!editable);
  // The Historikals menu, the stake picked for an epic battle, and the camera once you've chosen.
  const [menu, setMenu] = useState(false);
  const [staking, setStaking] = useState(false);
  const [drawing, setDrawing] = useState<DrawKind | null>(null);
  // A Historikal tapped in the row opens its card (moves shown on your own, hidden on someone else's).
  const [card, setCard] = useState<ShownBadge | null>(null);
  const lineupKeys = shown.filter((b) => b.key.startsWith("i:")).map((b) => b.key);
  const router = useRouter();
  const [camera, setScan] = useState<{ intent?: "trade" | "battle"; stake?: Stake } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setWidth(el.clientWidth);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!tip) return;
    const away = (e: Event) => {
      if (!(e.target as HTMLElement).closest?.("[data-about-badge], [data-badge-tip]")) setTip(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [tip]);

  // The slim row fills the space beside the portrait, out to where the thought bubble ends: five badges
  // and the trade (or eye) button share the width.
  const gap = 4;
  const px = compact ? Math.max(28, Math.min(48, Math.floor((width - gap * 5) / 6))) : 42;
  const leads = compact && !!tradeHref;
  const nBadges = Math.min(shown.length, SHOW_MAX);
  const eyeEnd = compact && !editable && (earned.length || tradable.length);
  // Your own row beside the portrait: the Historikals button leads, small enough to leave the same EVEN
  // gap above it (to the banner's edge, half the 104px portrait up) as beside it; the Proof and the
  // badges after it are all one size, sharing what is left; every gap is EVEN px, the one between the
  // portrait and the button too (the button steps back over the portrait's 11px).
  const PORTRAIT_GAP = 11;
  const EVEN = 7;
  const LEAD_PX = 104 / 2 - EVEN;
  const endPx = leads ? LEAD_PX : compact ? Math.round(px * 1.35) : px;
  const nItems = (leads ? 1 : 0) + (token ? 1 : 0) + nBadges + (eyeEnd ? 1 : 0);
  // Four Historikals now: each as tall as the button, packed beside it, rather than spread thin across the row.
  const shared = leads ? Math.max(22, Math.min(endPx, Math.floor((width + PORTRAIT_GAP - EVEN * nItems - endPx - (eyeEnd ? px : 0)) / Math.max(1, nBadges + (token ? 1 : 0))))) : 0;
  // Elsewhere (someone else's profile) the Proof leads, a size up, and the badges step down to fit.
  const tokPx = leads ? shared : compact ? Math.round(px * 1.35) : px;
  const badgePx = leads
    ? shared
    : compact ? Math.max(22, Math.min(px, Math.floor((width - EVEN * (Math.max(4, nBadges) + 1) - endPx - (token ? tokPx : 0)) / Math.max(4, nBadges)))) : px;
  const endBtn: React.CSSProperties = compact
    ? // Its bottom sits on the portrait's (the row is lowered 6px, so it rises 6px back), and the space after
      // it matches the 11px between it and the portrait.
      { position: "relative", flex: "none", alignSelf: "flex-end", marginBottom: 6, width: endPx, height: endPx, display: "grid", placeItems: "center", background: "var(--blk-pur)", border: 0, borderRadius: 0, color: "#fff", cursor: "pointer", textDecoration: "none" }
    : { position: "relative", flex: "none", width: px, height: px, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer", textDecoration: "none" };
  const tipBadge = tip ? shown.find((b) => b.key === tip.key) : undefined;
  const iconPx = compact ? Math.round(endPx * 0.5) : 22;
  const leadBtn: React.CSSProperties = leads ? { ...endBtn, marginLeft: EVEN - PORTRAIT_GAP } : endBtn;
  const tradeEl = tradeHref && scan ? (
        <>
          <button type="button" aria-label="Historikals: trade, battle, or edit your lineup" aria-haspopup="menu" aria-expanded={menu} title="Historikals" onClick={() => setMenu((m) => !m)} style={leadBtn}>
            <TradeIcon size={iconPx} />
            {tradeCount ? (
              <span aria-hidden className="px" style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>{tradeCount}</span>
            ) : null}
          </button>
          {menu ? (
            <HkMenu
              shown={shown}
              tradable={tradable}
              onClose={() => setMenu(false)}
              items={[
                // Draws stack up from quests, helps, wins and birthdays; open them here, a chest at a time.
                { label: "FIND ONE!", go: () => setDrawing("normal"), n: draws?.normal ?? 0, cls: "find" },
                { label: "SUMMON ONE!", go: () => setDrawing("main"), n: draws?.main ?? 0, cls: "summon" },
                { label: "TRADE", go: () => setScan({ intent: "trade" }) },
                // Every one you hold: hearts, type, moves, healing.
                { label: "MY HISTORIKALS", view: "all" },
                { label: "BATTLE", go: () => setScan({ intent: "battle" }) },
                { label: "★ EPIC BATTLE", go: () => setStaking(true) },
              ]}
            />
          ) : null}
          {staking ? (
            // What you put up: your Proof, or one of your Historikals. The winner takes a copy of the
            // loser's Proof, or the loser's Historikal.
            <div role="dialog" aria-label="What do you put up?" className="hk-stake">
              <div style={{ display: "flex", alignItems: "center" }}>
                <div className="px" style={{ fontSize: 12, color: "#f2b544" }}>★ EPIC BATTLE · WHAT DO YOU PUT UP?</div>
                <span className="spacer" />
                <button type="button" className="btn btn-sm" onClick={() => setStaking(false)} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>✕</button>
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>If they put theirs up too, the winner takes a copy of the loser&apos;s Proof, or the loser&apos;s Historikal.</div>
              <div className="hk-stake-grid">
                {token?.design ? (
                  <button type="button" onClick={() => { setStaking(false); setScan({ intent: "battle", stake: { token: true } }); }}>
                    <TokenImage design={token.design} size={64} /><span className="px">YOUR PROOF</span>
                  </button>
                ) : null}
                {/* Your Proof first, then your lineup: the Historikals on show in your badge display. */}
                {shown.filter((h) => h.key.startsWith("i:")).map((h) => (
                  <button key={h.key} type="button" onClick={() => { setStaking(false); setScan({ intent: "battle", stake: { item: Number(h.key.slice(2)) } }); }}>
                    <BadgeFace b={h} size={64} /><span className="px">{h.title.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {drawing ? <DrawScene kind={drawing} count={drawing === "main" ? draws?.main ?? 0 : draws?.normal ?? 0} onClose={() => { setDrawing(null); router.refresh(); }} /> : null}
          {camera ? <QrScanner onClose={() => setScan(null)} tradesHref={tradeHref} waiting={tradeCount} intent={camera.intent} stake={camera.stake} /> : null}
        </>
      ) : tradeHref ? (
        <Link
          href={tradeHref}
          aria-label="Your Historikals"
          title="Your Historikals"
          style={leadBtn}
        >
          <TradeIcon size={iconPx} />
          {tradeCount ? (
            <span aria-hidden className="px" style={{ position: "absolute", top: -6, right: -6, minWidth: 16, height: 16, display: "grid", placeItems: "center", fontSize: 10, lineHeight: 1, background: "var(--pur)", color: "#fff", borderRadius: 0 }}>
              {tradeCount}
            </span>
          ) : null}
        </Link>
      ) : null;

  return (
    <div ref={box} style={{ position: "relative", display: "flex", flexWrap: compact ? "nowrap" : "wrap", alignItems: "center", gap: compact ? EVEN : 6 }}>
      {compact ? tradeEl : null}
      {token ? (
        <button
          type="button"
          data-about-badge
          aria-label={token.title ? `${token.title}. ${token.line ?? ""}` : "Proof"}
          aria-expanded={tip?.key === "__token"}
          onClick={(e) => {
            const r = e.currentTarget;
            setTip((t) => (t?.key === "__token" ? null : { key: "__token", x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 6 }));
          }}
          style={{ flex: "none", width: tokPx, height: tokPx, display: "grid", placeItems: "center", padding: 0, background: "none", cursor: "pointer", lineHeight: 0, color: "var(--dim)", border: token.design ? 0 : "1px dashed var(--edge)", borderRadius: "var(--px-r)" }}
        >
          {token.design ? <TokenImage design={token.design} size={tokPx} /> : <span className="px" style={{ fontSize: 12 }}>?</span>}
        </button>
      ) : null}
      {children}
      {shown.slice(0, SHOW_MAX).map((b) => (
        <button
          key={b.key}
          type="button"
          data-about-badge
          aria-label={`${b.title}. ${b.line}`}
          aria-expanded={tip?.key === b.key}
          onClick={(e) => {
            if (b.hk) { setTip(null); setCard(b); return; }
            const r = e.currentTarget;
            setTip((t) => (t?.key === b.key ? null : { key: b.key, x: r.offsetLeft + r.offsetWidth / 2, top: r.offsetTop + r.offsetHeight + 6 }));
          }}
          style={{ flex: "none", padding: 0, background: "none", border: 0, cursor: "pointer", lineHeight: 0 }}
        >
          <BadgeFace b={b} size={badgePx} />
        </button>
      ))}
      {!noPen && !compact && (earned.length || tradable.length || editable) ? (
        <button
          type="button"
          aria-label={editable ? "See all your badges and choose which to show" : "See all their badges"}
          onClick={() => setChoosing(true)}
          style={{ flex: "none", width: 42, height: 42, display: "grid", placeItems: "center", background: "none", border: 0, borderRadius: "var(--px-r)", color: "var(--muted)", cursor: "pointer", fontSize: 15 }}
        >
          {editable ? "✎" : <EyeIcon />}
        </button>
      ) : null}
      {compact ? null : tradeEl}
      {compact && !editable && (earned.length || tradable.length) ? (
        <button
          type="button"
          aria-label="See all their badges"
          onClick={() => setChoosing(true)}
          style={{ ...endBtn, width: px, height: px }}
        >
          <EyeIcon />
        </button>
      ) : null}
      {tip?.key === "__token" && token ? (
        <BadgeTip
          x={tip.x}
          top={tip.top}
          width={width}
          title={token.title ?? "PROOF"}
          line={token.line ?? ""}
          action={
            token.href ? (
              <Link href={token.href} className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
                {token.actionLabel ?? "OPEN →"}
              </Link>
            ) : null
          }
        />
      ) : tipBadge && tip ? (
        <BadgeTip x={tip.x} top={tip.top} width={width} title={tipBadge.title} line={tipBadge.line} />
      ) : null}
      {card?.hk ? <HistorikalCard hk={card.hk} line={card.line} own={!!editable} lineupPos={lineupKeys.indexOf(card.key)} onEditLineup={editable ? () => setChoosing(true) : undefined} onClose={() => setCard(null)} /> : null}
      {choosing ? <BadgeViewer earned={earned} tradable={tradable} current={shown.map((b) => b.key)} editable={editable} aside={aside} onClose={() => setChoosing(false)} /> : null}
    </div>
  );
}

/** A pixel eye, for looking at someone else's badges. */
function EyeIcon() {
  const rows = ["..#####..", ".#.....#.", "#..###..#", "#.#####.#", "#..###..#", ".#.....#.", "..#####.."];
  return (
    <svg width={18} height={14} viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === "#" ? <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

/** A little pixel monster face: scan someone to trade or battle Historikals. */
export function TradeIcon({ size = 22 }: { size?: number }) {
  const rows = ["#.........#", "##.......##", ".#########.", "###########", "##..###..##", "##..###..##", "###########", "##.#.#.#.##", "##.......##", "###########", ".#########."];
  const on = (r: number, c: number) => rows[r][c] === "#";
  const id = `mf${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="11" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#e0398a" /><stop offset=".52" stopColor="#9184d9" /><stop offset="1" stopColor="#4c7df0" /></linearGradient></defs>
      {rows.flatMap((r, y) => [...r].map((_, x) => (on(y, x) ? <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill={`url(#${id})`} /> : null)))}
    </svg>
  );
}
