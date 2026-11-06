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

// Posting is not a place to go, so it is not a tab: the NEW POST button sits at the top of
// the feed instead, and the bar has room to breathe.
const TABS = [
  { href: "/", glyph: "▤", label: "FEED" },
  { href: "/ball", glyph: "◉", label: "BALL" },
  { href: "/wiki", glyph: "☰", label: "WIKI" },
  { href: "/whispers", glyph: "✉", label: "WHISPER" },
  { href: "/me", glyph: "☻", label: "ME" },
];

/** Until someone has registered there are two places to be: the registry and the wiki. */
const WELCOME_TABS = [
  { href: "/welcome", glyph: "✎", label: "REGISTRY", alert: true },
  { href: "/wiki", glyph: "☰", label: "WIKI" },
];

/** A five-by-eight pixel glyph, drawn two screen pixels to the cell. */
function PixelGlyph({ rows, fill, label }: { rows: string[]; fill: string; label?: string }) {
  const cells: React.ReactNode[] = [];
  rows.forEach((row, y) => [...row].forEach((c, x) => c === "1" && cells.push(<rect key={`${x}${y}`} x={x} y={y} width={1} height={1} />)));
  return (
    <svg
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      viewBox="0 0 5 8"
      width={10}
      height={16}
      shapeRendering="crispEdges"
      fill={fill}
      style={{ display: "block" }}
    >
      {cells}
    </svg>
  );
}

/** The registry tab's pen, and the red "!" beside it until the form is done: the same
 *  size, side by side, centred over the label. */
const PEN = ["00011", "00111", "01111", "01110", "11100", "11000", "10000", "10000"];
const BANG = ["01110", "01110", "01110", "01110", "01110", "00000", "01110", "01110"];
function RegistryMark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, height: 16 }}>
      <PixelGlyph rows={PEN} fill="currentColor" />
      <PixelGlyph rows={BANG} fill="#f02828" label="Not yet registered" />
    </span>
  );
}

export function TabBar({ welcoming = false, unreadWhispers = 0 }: { welcoming?: boolean; unreadWhispers?: number }) {
  const path = usePathname();
  const tabs: { href: string; glyph: string; label: string; alert?: boolean }[] = welcoming ? WELCOME_TABS : TABS;

  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        // The motion board lives in the Ball now, so the composer under /vote counts as the Ball.
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href) || (t.href === "/ball" && path.startsWith("/vote"));
        return (
          // Not prefetched: every tab is a dynamic, auth'd route, and six of
          // them warming at once is what races the session refresh.
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className="tab"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            {t.alert ? (
              <span className="glyph">
                <RegistryMark />
              </span>
            ) : (
              <span className="glyph" aria-hidden>
                {t.glyph}
              </span>
            )}
            {t.href === "/whispers" && unreadWhispers > 0 ? (
              <span className="tab-badge" role="status" aria-label={`${unreadWhispers} unread ${unreadWhispers === 1 ? "whisper" : "whispers"}`}>
                {unreadWhispers > 9 ? "9+" : unreadWhispers}
              </span>
            ) : null}
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

/** Shown under the header until a new arrival has picked a handle. Hidden on
 *  the edit page itself, where the form is already the prompt. */
export function SetupBanner() {
  const path = usePathname();
  if (path.startsWith("/me/edit")) return null;

  return (
    <Link href="/me/edit" className="setup-banner">
      <span className="px" style={{ fontSize: 11 }}>
        FINISH SETTING UP YOUR PROFILE
      </span>
      <span className="spacer" />
      <span className="px" style={{ fontSize: 11 }}>
        PICK A HANDLE →
      </span>
    </Link>
  );
}
