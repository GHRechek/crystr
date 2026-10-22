"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { untilReady } from "@/lib/crystr";

type Phase = "idle" | "starting" | "running" | "done";

/** The timer for quests that are about time. Pressing BEGIN has the server stamp the
 *  start; the screen then belongs to the countdown until it finishes. Looking away
 *  (switching apps or tabs) or pressing STOP ends it, and it can be begun again.
 *  The server checks the full time has passed before it will pay, so this screen is
 *  the experience, not the proof. */
export function StillTimer({
  slug,
  seconds,
  onDone,
}: {
  slug: string;
  seconds: number;
  onDone: (done: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(seconds);
  const [message, setMessage] = useState("");
  const endAt = useRef(0);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  function stop(why: string) {
    setPhase("idle");
    setLeft(seconds);
    setMessage(why);
    onDone(false);
  }

  async function begin() {
    setMessage("");
    setPhase("starting");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("cr_start_quest_timer", { p_slug: slug });
    const r = data as { ok?: boolean; code?: string; ready_at?: string } | null;
    if (error || !r?.ok) {
      setPhase("idle");
      if (r?.code === "full") setMessage("You are as full as you can be right now. Come back when you have spent a little.");
      else if (r?.code === "cooldown" && r.ready_at) setMessage(`You have done this one recently. It will be ready again in ${untilReady(r.ready_at)}.`);
      else setMessage("That did not start. Please try again.");
      return;
    }
    endAt.current = Date.now() + seconds * 1000;
    setLeft(seconds);
    setPhase("running");
  }

  // The countdown runs off the clock, not a tick count, so a slow or throttled
  // timer cannot drift it.
  useEffect(() => {
    if (phase !== "running") return;
    const tick = () => {
      const remaining = Math.ceil((endAt.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setLeft(0);
        setPhase("done");
        onDone(true);
      } else {
        setLeft(remaining);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // While it runs: the page cannot scroll, the screen stays awake, and looking away ends it.
  useEffect(() => {
    if (phase !== "running") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const away = () => {
      if (document.visibilityState === "hidden") {
        stop("You looked away, so it stopped. Begin again whenever you are ready.");
      }
    };
    document.addEventListener("visibilitychange", away);

    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock?.request("screen").then((l) => (lock.current = l)).catch(() => {});

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("visibilitychange", away);
      void lock.current?.release().catch(() => {});
      lock.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");
  const pct = Math.min(100, Math.max(0, ((seconds - left) / seconds) * 100));

  return (
    <>
      {phase === "running" ? (
        <div
          role="dialog"
          aria-label="Sitting still"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "var(--device, #0b0b14)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div className="px" style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.8 }}>
            PUT THIS DOWN
          </div>
          <div className="px" style={{ fontSize: 56, color: "var(--pur-bright)", letterSpacing: ".04em" }}>
            {mm}:{ss}
          </div>
          <div style={{ width: "min(260px, 70vw)", height: 3, background: "var(--edge)" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--pur)", transition: "width .25s linear" }} />
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--dim)", maxWidth: 260 }}>
            Look at something that is not lit from behind. Stay with it. The first ninety seconds are the worst.
          </div>
        </div>
      ) : null}

      <div
        className="placeholder"
        style={{
          minHeight: 150,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 18,
          boxShadow: `inset 0 0 0 2px ${phase === "done" ? "var(--blu)" : "var(--edge-hover)"}`,
        }}
      >
        <div className="px" style={{ fontSize: 20, color: phase === "done" ? "var(--blu)" : "var(--pur-soft)" }}>
          {phase === "done" ? "✓" : "◷"}
        </div>
        <div className="px" style={{ fontSize: 9, color: "var(--dim)", textAlign: "center", lineHeight: 1.7 }}>
          {phase === "done" ? "THE TIME IS UP" : "THE TIMER"}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.5, maxWidth: 250 }}>
          {phase === "done"
            ? "Two minutes. Well done. Take what it gave you."
            : message ||
              "Press begin and the screen will keep time for you. Looking away stops it, and you can start again."}
        </div>
        {phase !== "done" ? (
          <button
            type="button"
            className="btn btn-sm btn-purple"
            onClick={begin}
            disabled={phase === "starting"}
            style={{ minHeight: 36 }}
          >
            {phase === "starting" ? "ONE MOMENT…" : `BEGIN · ${seconds >= 60 ? `${Math.round(seconds / 60)} MIN` : `${seconds} SEC`}`}
          </button>
        ) : null}
      </div>
    </>
  );
}
