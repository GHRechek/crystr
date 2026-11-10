"use client";

import { useEffect, useState } from "react";
import { QrCode } from "@/components/qr";

/** Your code, big on a white card, for someone to scan: to help you, trade with you, or battle you. */
export function YourCode({ handle, onClose }: { handle: string; onClose: () => void }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div role="dialog" aria-label="Your code" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(5,3,12,.85)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "6px 6px 0 #0a0616" }}>
        {origin ? <QrCode text={`${origin}/u/${handle}`} size={232} label="Your code. Someone scans it to help you, trade with you, or battle you." /> : <div style={{ width: 232, height: 232 }} />}
        <div className="px" style={{ fontSize: 11, color: "#1a1033", letterSpacing: ".06em" }}>YOUR CODE · {handle.toUpperCase()}</div>
        <button type="button" className="btn btn-sm" onClick={onClose} style={{ minHeight: 40, alignSelf: "stretch" }}>CLOSE</button>
      </div>
    </div>
  );
}
