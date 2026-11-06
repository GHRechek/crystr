"use client";

import { useState } from "react";
import { ITEMS } from "@/lib/token";

/** "Attach image": the picture on a dispatch or op-ed is an icon from the same set the token
 *  designer uses, picked from a drawer. The choice travels in a hidden field named `name`
 *  (empty for none). Once one is picked the button shows it, with a way to change or remove it. */
export function IconPicker({ name, initial }: { name: string; initial?: string | null }) {
  const [slug, setSlug] = useState<string>(initial && ITEMS.some((i) => i.slug === initial) ? initial : "");
  const [open, setOpen] = useState(false);
  const item = ITEMS.find((i) => i.slug === slug);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="hidden" name={name} value={slug} />
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <button type="button" className={`btn${item ? " btn-purple" : ""}`} onClick={() => setOpen(true)} style={{ flex: 1, minHeight: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          {item ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/badges/items/${item.slug}.png`} alt="" width={item.w * 2} height={item.h * 2} style={{ imageRendering: "pixelated", display: "block" }} />
              <span>{item.label.toUpperCase()} · CHANGE</span>
            </>
          ) : (
            <span>▣ ATTACH IMAGE</span>
          )}
        </button>
        {item ? (
          <button type="button" className="btn btn-mag" aria-label="Take the image off" onClick={() => setSlug("")} style={{ minHeight: 44, minWidth: 44 }}>
            ✕
          </button>
        ) : null}
      </div>

      {open ? (
        <div role="dialog" aria-label="Pick an image" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", maxWidth: 480, margin: "0 auto" }}>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{ flex: 1, border: 0, background: "rgba(5,5,12,.6)", cursor: "default" }} />
          <div style={{ maxHeight: "72%", overflowY: "auto", background: "var(--device)", boxShadow: "0 -1px 0 var(--edge), 0 -12px 36px rgba(0,0,0,.5)", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className="px" style={{ fontSize: 12, color: "var(--pur-soft)" }}>PICK AN IMAGE</div>
              <div className="spacer" />
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} style={{ minHeight: 40, padding: "0 9px" }}>
                ✕
              </button>
            </div>
            <div role="listbox" aria-label="Images" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
              {ITEMS.map((it) => (
                <button
                  key={it.slug}
                  type="button"
                  role="option"
                  aria-selected={it.slug === slug}
                  aria-label={it.label}
                  title={it.label}
                  onClick={() => {
                    setSlug(it.slug);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: 48,
                    padding: 0,
                    cursor: "pointer",
                    background: it.slug === slug ? "rgba(145,132,217,.18)" : "var(--surface)",
                    border: `1px solid ${it.slug === slug ? "var(--pur)" : "var(--edge)"}`,
                    borderRadius: "var(--px-r)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/badges/items/${it.slug}.png`} alt="" width={it.w * 2} height={it.h * 2} style={{ imageRendering: "pixelated" }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
