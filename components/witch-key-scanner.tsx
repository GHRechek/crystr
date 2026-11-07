"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { HANDLE_PATTERN, KEY_PATTERN } from "@/lib/breach";

/** The camera, full screen, looking for a witch's key: a witch's own profile QR (…/u/<handle>), as
 *  the registry takes it, or an old override key (…/override/<code>). Found, it hands the handle or
 *  code over. Nothing is checked here: the database decides whether it's a witch's. */
export function WitchKeyScanner({ title, why, problem, onKey, onClose }: { title: string; why: string; /** Said after a scan that didn't take. */ problem?: string | null; onKey: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const keyOf = (text: string): string | null => {
      try {
        const u = new URL(text);
        if (u.origin !== window.location.origin) return null;
        const o = /^\/override\/([0-9a-f]{32})\/?$/.exec(u.pathname);
        if (o && KEY_PATTERN.test(o[1])) return o[1];
        const h = /^\/u\/([a-z0-9_.-]{1,40})\/?$/i.exec(u.pathname);
        return h && HANDLE_PATTERN.test(h[1].toLowerCase()) ? h[1].toLowerCase() : null;
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
          const k = keyOf(hit.data);
          if (k) {
            stop = true;
            stream?.getTracks().forEach((t) => t.stop());
            onKey(k);
            return;
          }
          setErr("That isn't a witch's code. Ask a witch to show you the QR code on their profile.");
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
  }, [onKey]);

  return (
    <div role="dialog" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 90, maxWidth: 480, margin: "0 auto", background: "#120e24", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <div className="px" style={{ fontSize: 18, lineHeight: 1.2, color: "#fff", textShadow: "2px 2px 0 #1a1033" }}>{title}</div>
        <span className="spacer" />
        <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Close" style={{ minHeight: 40, padding: "0 10px" }}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#000" }}>
        <video ref={video} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div aria-hidden style={{ position: "absolute", inset: "18% 14%", boxShadow: "0 0 0 2px #9184d9, 0 0 0 9999px rgba(18,14,36,.45)" }} />
      </div>
      <div style={{ padding: "14px 16px 22px", fontSize: 12.5, lineHeight: 1.5, color: err || problem ? "#ffb3cf" : "var(--muted)" }}>{err ?? problem ?? why}</div>
    </div>
  );
}
