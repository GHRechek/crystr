"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EmojiImg } from "@/components/emoji-img";
import { BadgeArt, TokenImage } from "@/components/badges";
import { BadgeTip } from "@/components/badge-tip";
import { ROMAN, type BadgeRow } from "@/lib/badges";
export { starBadges } from "@/lib/star-badges";

/** A profile's star row, where OBSESSED WITH was: a purple star, the person's Proof, then four small badges.
 *  Tap the Proof or a badge and a bubble says what it is. On your own profile the star opens the page where
 *  you pick the four. */
export function StarRow({ token, badges, href, whose }: { token: unknown; badges: BadgeRow[]; href?: string; /** Whose Proof it is, for its bubble ("Your" or a handle). */ whose?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ key: string; x: number; top: number; title: string; line: string } | null>(null);
  const [width, setWidth] = useState(320);
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
    const away = (e: Event) => { if (!(e.target as HTMLElement).closest?.("[data-star-item], [data-badge-tip]")) setTip(null); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("keydown", esc); };
  }, [tip]);
  const show = (e: React.MouseEvent<HTMLButtonElement>, key: string, title: string, line: string) => {
    const el = e.currentTarget, b = box.current;
    const x = b ? el.getBoundingClientRect().left - b.getBoundingClientRect().left + el.offsetWidth / 2 : 20;
    setTip((t) => (t?.key === key ? null : { key, x, top: el.offsetTop + el.offsetHeight + 6, title, line }));
  };
  const item: React.CSSProperties = { flex: "none", padding: 0, background: "none", border: 0, cursor: "pointer", lineHeight: 0 };
  const star = (
    <span style={{ flex: "none", width: 23, height: 21, display: "grid", placeItems: "center" }}>
      <EmojiImg e="star" from="/emoji/star.png" crystr size={18} />
    </span>
  );
  return (
    <div ref={box} style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
      {href ? <Link href={href} aria-label="Your star badges: pick which four show" className="star-spin" style={{ color: "inherit", textDecoration: "none", display: "block" }}>{star}</Link> : <span className="star-spin">{star}</span>}
      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        {token ? (
          <button type="button" data-star-item aria-label="Proof" onClick={(e) => show(e, "__token", "PROOF", whose === "Your" ? "Your Proof: the token you made, that others can hold." : `${whose ?? "Their"}'s Proof: the token they made, that others can hold.`)} style={item}>
            <TokenImage design={token} size={21} alt="Proof" />
          </button>
        ) : null}
        {badges.map((b) => {
          const title = `${b.title}${b.tiers > 1 && b.tier ? ` ${ROMAN[b.tier]}` : ""}`;
          return (
            <button key={b.slug} type="button" data-star-item aria-label={title} onClick={(e) => show(e, b.slug, title.toUpperCase(), b.blurb || b.how)} style={item}>
              <BadgeArt b={b} got tier={b.tier} size={21} />
            </button>
          );
        })}
        {!token && !badges.length ? <span style={{ fontSize: 12.5, color: "var(--muted)" }}>No badges yet</span> : null}
      </span>
      {tip ? <BadgeTip x={tip.x} top={tip.top} width={width} title={tip.title} line={tip.line} /> : null}
    </div>
  );
}
