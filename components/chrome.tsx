"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FLASH_COOKIE, type Flash } from "@/lib/toast";

/** The status bar clock. Client-side so the server doesn't render a time
 *  that's already wrong by the time it arrives. */
export function Clock() {
  const [now, setNow] = useState<string>("--:--");

  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{now}</span>;
}

/** Seven tabs wouldn't fit, so the Well lives next to the mana meter. It
 *  turns magenta when you drop below eleven. */
export function WellButton({ low }: { low: boolean }) {
  const path = usePathname();
  const here = path.startsWith("/well");

  return (
    <Link
      href="/well"
      className="btn btn-sm"
      style={{
        fontSize: "8.5px",
        minHeight: 26,
        padding: "0 9px",
        borderColor: here ? "var(--pur)" : low ? "var(--mag)" : "var(--edge)",
        background: low ? "rgba(224,57,138,.16)" : "transparent",
        color: low ? "var(--mag-pale)" : "var(--pur-pale)",
      }}
    >
      ◈ THE WELL ＋
    </Link>
  );
}

const TABS = [
  { href: "/", glyph: "▤", label: "FEED" },
  { href: "/ball", glyph: "◉", label: "BALL" },
  { href: "/vote", glyph: "▥", label: "VOTE" },
  { href: "/post", glyph: "✚", label: "POST" },
  { href: "/whispers", glyph: "✉", label: "WHISPER" },
  { href: "/me", glyph: "☻", label: "ME" },
];

export function TabBar() {
  const path = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          // Not prefetched: every tab is a dynamic, auth'd route, and six of
          // them warming at once is what races the session refresh.
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className="tab"
            data-active={active}
          >
            <span className="glyph" aria-hidden>
              {t.glyph}
            </span>
            <span className="label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Renders the flash cookie the last server action set, then clears it so a
 *  refresh doesn't show the same snark twice. */
export function Toast({ flash }: { flash: Flash }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`;
    const id = setTimeout(() => setGone(true), 4200);
    return () => clearTimeout(id);
  }, []);

  if (gone) return null;

  return (
    <div
      className="toast"
      role="status"
      style={{ boxShadow: `0 0 0 1px ${flash.e}, 0 10px 30px rgba(0,0,0,.6)` }}
    >
      <div className="k" style={{ color: flash.e }}>
        {flash.k}
      </div>
      <div className="t">{flash.t}</div>
    </div>
  );
}
