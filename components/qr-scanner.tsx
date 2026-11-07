"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { BadgeArt } from "@/components/badges";
import { claimBadge, claimHelp, scanPerson, type Scanned } from "@/lib/actions";
import { startEncounter } from "@/components/encounter";
import { targetLabel } from "@/lib/species";

/** The camera, full screen, looking for another person's CRYSTR code. A code that points at a
 *  profile (…/u/<handle>) opens the trade page with that person. */
export function QrScanner({ onClose, tradesHref, waiting, mode = "general", only, title, how }: { only?: string; title?: string; how?: string; onClose: () => void; tradesHref?: string; waiting?: number; /** "general": trade, open a profile, or say they helped you. "quest": only the quests you can do with them. */ mode?: "general" | "quest" }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [found, setFound] = useState<Scanned | null>(null);
  const [view, setView] = useState<"pick" | "quests">(mode === "quest" ? "quests" : "pick");
  const [sent, setSent] = useState<string[]>([]);
  const shown = (found?.quests ?? []).filter((q) => !only || q.slug === only);

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const handleOf = (text: string): string | null => {
      try {
        const u = new URL(text);
        if (u.origin !== window.location.origin) return null;
        const m = /^\/u\/([a-z0-9_.-]{1,40})\/?$/i.exec(u.pathname);
        return m ? m[1].toLowerCase() : null;
      } catch {
        return null;
      }
    };

    const tick = () => {
      if (stop) return;
      const v = video.current;
      if (v && ctx && v.readyState >= 2 && v.videoWidth) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (hit?.data) {
          const h = handleOf(hit.data);
          if (h) {
            stop = true;
            stream?.getTracks().forEach((t) => t.stop());
            scanPerson(h, mode === "quest").then((p) => (p === "self" ? setErr("That is your own code. Scan someone else's. Close this and try again.") : p ? setFound(p) : setErr("That person is not in the City. Close this and scan again.")));
            return;
          }
          setErr("That code is not a CRYSTR person.");
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stop) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        raf = requestAnimationFrame(tick);
      } catch {
        setErr("The camera would not open. Allow camera access for this site and try again.");
      }
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose, router, mode]);

  return (
    <div role="dialog" aria-label="Scan someone's code" style={{ position: "fixed", inset: 0, zIndex: 90, maxWidth: 480, margin: "0 auto", background: "#120e24", display: "flex", flexDirection: "column" }}>
      {/* What the scan is for, big, on the CRYSTR colours. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 16px 14px", background: "linear-gradient(90deg,#e0398a,#9184d9 52%,#4c7df0)" }}>
        <div className="px" style={{ fontSize: 20, lineHeight: 1.2, color: "#fff", textShadow: "2px 2px 0 #1a1033" }}>{mode === "quest" ? (title ?? "QUEST").toUpperCase() : "GET HISTORIKAL"}</div>
        <span className="spacer" />
        {tradesHref ? (
          <Link href={tradesHref} onClick={onClose} className="px" style={{ fontSize: 11, color: "#fff" }}>
            YOURS{waiting ? ` · ${waiting}` : ""} →
          </Link>
        ) : null}
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>
          ✕
        </button>
      </div>
      {found ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--device)", padding: "4px 16px calc(24px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: 12, justifyContent: view === "pick" ? "flex-end" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={found.face} alt="" width={56} height={56} style={{ imageRendering: "pixelated", borderRadius: "var(--px-r)" }} />
            <div style={{ minWidth: 0 }}>
              <div className="px" style={{ fontSize: 13, lineHeight: 1.5, overflowWrap: "anywhere" }}>{found.handle}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{[found.species ? targetLabel(found.species) : null, found.spellcaster ? "casts spells" : null].filter(Boolean).join(" · ") || found.name || ""}</div>
            </div>
          </div>

          {view === "pick" ? (
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  // Trades and battles happen right here, on both phones at once.
                  ["⇄", "TRADE", async () => { onClose(); await startEncounter("trade", found.id); }],
                  ["⚔", "BATTLE", async () => { onClose(); await startEncounter("battle", found.id); }],
                  ["☺", "PROFILE", () => { router.push(`/u/${found.handle}`); onClose(); }],
                ] as [string, string, () => void][]
              ).map(([icon, label, go]) => (
                <button key={label} type="button" onClick={go} className="btn" style={{ flex: 1, minHeight: 84, flexDirection: "column", gap: 6, padding: "10px 4px" }}>
                  <span aria-hidden style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
                  <span className="px" style={{ fontSize: 11 }}>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {mode === "quest" ? null : <button type="button" className="btn btn-sm" onClick={() => setView("pick")} style={{ minHeight: 36 }}>← BACK</button>}
                <span className="px" style={{ fontSize: 11, color: "var(--pur-soft)" }}>WHAT HAPPENED WITH THEM?</span>
              </div>
              {only === "a-helping-hand" ? (
                <>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--muted)" }}>{found.handle} gets a note asking whether you helped them. If they say yes, it counts, and every three helps bring a good Historikal.</div>
                  <form action={async (fd) => { await claimHelp(fd); setSent((x) => [...x, "a-helping-hand"]); }}>
                    <input type="hidden" name="other_id" value={found.id} />
                    <button type="submit" disabled={sent.includes("a-helping-hand")} className="btn btn-purple btn-block" style={{ minHeight: 48 }}>{sent.includes("a-helping-hand") ? "ASKED" : "I HELPED THEM"}</button>
                  </form>
                </>
              ) : shown.length === 0 ? (
                <div className="empty">{only ? `${found.handle.toUpperCase()} CANNOT BE PART OF THIS ONE` : "NO QUESTS YOU CAN DO WITH THEM RIGHT NOW"}</div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {shown.map((q) => {
                    const done = sent.includes(q.slug);
                    return (
                      <li key={q.slug}>
                        <form
                          action={async (fd) => {
                            await claimBadge(fd);
                            setSent((x) => [...x, q.slug]);
                          }}
                        >
                          <input type="hidden" name="slug" value={q.slug} />
                          <input type="hidden" name="other_id" value={found.id} />
                          <button type="submit" disabled={done} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "8px 10px", background: "var(--blk)", border: `1px solid ${done ? "var(--pur)" : "var(--edge)"}`, borderRadius: "var(--px-r)", color: "inherit", font: "inherit", cursor: done ? "default" : "pointer", opacity: done ? 0.7 : 1 }}>
                            <span style={{ flex: "none", lineHeight: 0 }}>
                              <BadgeArt b={{ art: q.art, slug: q.slug, tiers: q.tiers }} got={false} tier={0} size={42} />
                            </span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span className="px" style={{ display: "block", fontSize: 11, lineHeight: 1.5 }}>{q.title}</span>
                              <span style={{ display: "block", fontSize: 12, lineHeight: 1.4, color: "var(--muted)" }}>{q.how}</span>
                            </span>
                            <span className="px" style={{ flex: "none", fontSize: 11, color: "var(--pur-pale)" }}>{done ? (q.instant ? "DONE" : "ASKED") : q.instant ? "COMPLETE →" : "ASK →"}</span>
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      ) : (
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "grid", placeItems: "center" }}>
        <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", width: "62%", aspectRatio: "1", border: "4px solid #e0398a", outline: "4px solid #4c7df0", borderRadius: 0, boxShadow: "0 0 0 999px rgba(18,14,36,.6)" }} />
      </div>
      )}
      <div style={{ padding: "14px 16px 22px", fontSize: 12.5, lineHeight: 1.5, color: err ? "var(--mag-soft)" : "var(--pur-pale)", textAlign: "center", background: "#2b1f4f" }}>
        {found ? (view === "quests" ? "One at a time. They get a whisper and say yes or no." : "") : err ?? (mode === "quest" ? (title ? `${title}: ${how ?? ""} Point the camera at their code.` : "Point the camera at their code to see which quests you can do with them.") : "Point the camera at the code on someone's profile menu.")}
      </div>
    </div>
  );
}
