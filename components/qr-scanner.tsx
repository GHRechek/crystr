"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

/** The camera, full screen, looking for another person's CRYSTR code. A code that points at a
 *  profile (…/u/<handle>) opens the trade page with that person. */
export function QrScanner({ onClose, tradesHref, waiting }: { onClose: () => void; tradesHref?: string; waiting?: number }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

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
            router.push(`/u/${h}/trade`);
            onClose();
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
  }, [onClose, router]);

  return (
    <div role="dialog" aria-label="Scan someone's code" style={{ position: "fixed", inset: 0, zIndex: 90, maxWidth: 480, margin: "0 auto", background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px" }}>
        <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>SCAN THEIR CODE</div>
        <span className="spacer" />
        {tradesHref ? (
          <Link href={tradesHref} onClick={onClose} className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
            MY TRADES{waiting ? ` · ${waiting}` : ""} →
          </Link>
        ) : null}
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>
          ✕
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "grid", placeItems: "center" }}>
        <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", width: "62%", aspectRatio: "1", border: "2px solid var(--pur)", borderRadius: 8, boxShadow: "0 0 0 999px rgba(0,0,0,.45)" }} />
      </div>
      <div style={{ padding: "12px 16px 20px", fontSize: 12.5, lineHeight: 1.5, color: err ? "var(--mag-soft)" : "var(--muted)", textAlign: "center" }}>
        {err ?? "Point the camera at the code on someone's profile menu. It opens a trade with them."}
      </div>
    </div>
  );
}
