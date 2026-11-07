"use client";

import { useEffect, useRef, useState } from "react";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** One pixel reel: a hub with six teeth, drawn on a 9x9 grid around (cx, cy). */
function Reel({ cx, cy, spin }: { cx: number; cy: number; spin: boolean }) {
  return (
    <g className={spin ? "cassette-spin" : undefined} style={{ transformOrigin: `${cx + 0.5}px ${cy + 0.5}px`, transformBox: "view-box" }}>
      <rect x={cx - 3} y={cy - 4} width={7} height={9} fill="#f1eee6" />
      <rect x={cx - 4} y={cy - 3} width={9} height={7} fill="#f1eee6" />
      <rect x={cx - 1} y={cy - 1} width={3} height={3} fill="#1a1626" />
      <rect x={cx} y={cy - 3} width={1} height={2} fill="#1a1626" />
      <rect x={cx} y={cy + 2} width={1} height={2} fill="#1a1626" />
      <rect x={cx - 3} y={cy} width={2} height={1} fill="#1a1626" />
      <rect x={cx + 2} y={cy} width={2} height={1} fill="#1a1626" />
    </g>
  );
}

/** A pixel cassette tape that plays a voice clip. Tap it to play or pause; the reels turn while it
 *  plays and the label counts the time. `load` fetches the clip the first time it is played (so
 *  nothing downloads until someone wants to hear it). `onFirstPlay` runs once, when it starts (a
 *  voice whisper uses it to mark itself heard and remove the file). A `dead` cassette is one that
 *  has been heard: greyed out, and it no longer plays. */
export function Cassette({
  seconds,
  load,
  onFirstPlay,
  dead,
  title = "VOICE",
  demo,
}: {
  seconds: number;
  load?: () => Promise<string | null>;
  onFirstPlay?: () => void;
  dead?: boolean;
  title?: string;
  /** For previews only: show it mid-play. */
  demo?: "playing";
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(demo === "playing");
  const [at, setAt] = useState(demo === "playing" ? Math.round(seconds * 0.4) : 0);
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const started = useRef(false);

  useEffect(() => () => audio.current?.pause(), []);

  const off = dead || gone;
  const toggle = async () => {
    if (off || busy || demo) return;
    if (audio.current) {
      if (audio.current.paused) void audio.current.play();
      else audio.current.pause();
      return;
    }
    if (!load) return;
    setBusy(true);
    const src = await load();
    setBusy(false);
    if (!src) {
      setGone(true);
      return;
    }
    const a = new Audio(src);
    audio.current = a;
    a.ontimeupdate = () => setAt(a.currentTime);
    a.onplay = () => {
      setPlaying(true);
      if (!started.current) {
        started.current = true;
        onFirstPlay?.();
      }
    };
    a.onpause = () => setPlaying(false);
    a.onended = () => {
      setPlaying(false);
      setAt(seconds);
      if (onFirstPlay) setGone(true);
    };
    void a.play();
  };

  const total = Math.max(1, seconds);
  const filled = Math.round((Math.min(at, total) / total) * 28);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={off}
      aria-label={off ? "This voice note has been played" : playing ? "Pause" : `Play voice note, ${fmt(total)}`}
      style={{ position: "relative", display: "block", width: 192, padding: 0, border: 0, background: "none", cursor: off ? "default" : "pointer", lineHeight: 0, filter: off ? "grayscale(1)" : "none", opacity: off ? 0.45 : 1 }}
    >
      <svg viewBox="0 0 64 40" width={192} height={120} shapeRendering="crispEdges" aria-hidden="true" style={{ display: "block", imageRendering: "pixelated" }}>
        {/* body, with stepped corners */}
        <rect x={1} y={0} width={62} height={40} fill="#0e0c16" />
        <rect x={0} y={1} width={64} height={38} fill="#0e0c16" />
        <rect x={2} y={1} width={60} height={38} fill="#2b2640" />
        <rect x={1} y={2} width={62} height={36} fill="#2b2640" />
        {/* screws */}
        {[[3, 3], [59, 3], [3, 35], [59, 35]].map(([x, y]) => (
          <rect key={`${x}${y}`} x={x} y={y} width={2} height={2} fill="#5b5476" />
        ))}
        {/* label: the CRYSTR stripes, and a pale strip for the writing */}
        <rect x={6} y={3} width={52} height={26} fill="#e9e4d4" />
        <rect x={6} y={3} width={52} height={3} fill="#e0398a" />
        <rect x={6} y={6} width={52} height={2} fill="#9184d9" />
        <rect x={6} y={8} width={52} height={2} fill="#4c7df0" />
        {/* the window with the reels and the tape between them */}
        <rect x={13} y={15} width={38} height={11} fill="#1a1626" />
        <rect x={14} y={16} width={36} height={9} fill="#3a2f2a" />
        <rect x={22} y={16} width={20} height={9} fill="#1a1626" />
        <rect x={22} y={22} width={20} height={1} fill="#6b4a32" />
        <Reel cx={18} cy={20} spin={playing} />
        <Reel cx={45} cy={20} spin={playing} />
        {/* how far it has played, in pixel steps */}
        <rect x={18} y={27} width={28} height={1} fill="#c9c2ad" />
        {filled > 0 ? <rect x={18} y={27} width={filled} height={1} fill="#e0398a" /> : null}
        {/* the bottom of the shell, with its holes */}
        <rect x={14} y={30} width={36} height={9} fill="#221e33" />
        <rect x={13} y={31} width={38} height={8} fill="#221e33" />
        {[18, 25, 37, 44].map((x) => (
          <rect key={x} x={x} y={34} width={2} height={2} fill="#0e0c16" />
        ))}
        <rect x={30} y={33} width={4} height={3} fill="#0e0c16" />
      </svg>
      {/* the writing on the label */}
      <span className="px" style={{ position: "absolute", left: 24, right: 24, top: 32, display: "flex", justifyContent: "space-between", fontSize: 10, lineHeight: 1, color: "#2b2640" }}>
        <span>{off ? "PLAYED" : busy ? "…" : playing ? "▶ " + title : title}</span>
        <span>{off ? "" : `${fmt(playing || at ? at : total)}${playing || at ? ` / ${fmt(total)}` : ""}`}</span>
      </span>
    </button>
  );
}
