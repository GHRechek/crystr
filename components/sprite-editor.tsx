"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Sheet = { sheet: string; ids: string[] };
type Creature = { slug: string; name: string; files: string[] };
type Tool = "pencil" | "eraser" | "fill" | "pick";

const MAX_UNDO = 60;

/** A pixel editor over one sprite: a portrait cell (128x128, shown on a test face as you draw) or a
 *  Historikal's picture (its own size). Pencil, eraser, fill, eyedropper; the picture's own colours as a
 *  palette, plus any colour; undo and redo; zoom. SAVE writes it over the shipped file (lib/sprites);
 *  RESET takes that back. */
export function SpriteEditor({ sheets, creatures, overrides, skins, hairs }: {
  sheets: Sheet[];
  creatures: Creature[];
  /** Paths already edited, to say so. */
  overrides: string[];
  skins: string[];
  hairs: string[];
}) {
  const [mode, setMode] = useState<"portrait" | "creature">("portrait");
  const [sheet, setSheet] = useState(sheets.find((s) => s.sheet === "HairSides")?.sheet ?? sheets[0]?.sheet ?? "");
  const [id, setId] = useState("");
  const [slug, setSlug] = useState(creatures[0]?.slug ?? "");
  const [file, setFile] = useState("");
  const [edited, setEdited] = useState<Set<string>>(() => new Set(overrides));

  const ids = sheets.find((s) => s.sheet === sheet)?.ids ?? [];
  const files = creatures.find((c) => c.slug === slug)?.files ?? [];
  useEffect(() => { if (!ids.includes(id)) setId(ids[0] ?? ""); }, [sheet, ids, id]);
  useEffect(() => { if (!files.includes(file)) setFile(files[0] ?? ""); }, [slug, files, file]);

  const path = mode === "portrait" ? (sheet && id ? `portrait/${sheet}/${id}.png` : "") : file ? `creatures/${file}` : "";

  // The picture: pixels, size, and what was loaded (to know if anything changed).
  const [img, setImg] = useState<{ w: number; h: number; px: Uint8ClampedArray } | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string>("");
  const undo = useRef<Uint8ClampedArray[]>([]);
  const redo = useRef<Uint8ClampedArray[]>([]);
  const [, bump] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");

  const [tool, setTool] = useState<Tool>("pencil");
  const [colour, setColour] = useState("#ffffff");
  const [zoom, setZoom] = useState(0);   // 0: fit the width
  const [grid, setGrid] = useState(true);
  const [skin, setSkin] = useState(skins[1] ?? skins[0] ?? "#ffdfc4");
  const [hair, setHair] = useState(hairs[0] ?? "#6c4620");

  // Load the sprite whenever the path changes.
  useEffect(() => {
    if (!path) return;
    let gone = false;
    setNote("");
    (async () => {
      try {
        const r = await fetch(`/api/sprite?path=${encodeURIComponent(path)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status === 404 ? "No such sprite" : "Could not load");
        const bmp = await createImageBitmap(await r.blob());
        const c = document.createElement("canvas");
        c.width = bmp.width; c.height = bmp.height;
        const x = c.getContext("2d")!;
        x.drawImage(bmp, 0, 0);
        const d = x.getImageData(0, 0, bmp.width, bmp.height);
        if (gone) return;
        setImg({ w: d.width, h: d.height, px: new Uint8ClampedArray(d.data) });
        setLoadedFrom(path);
        undo.current = []; redo.current = []; setDirty(false);
      } catch (e) {
        if (!gone) { setImg(null); setNote(e instanceof Error ? e.message : "Could not load"); }
      }
    })();
    return () => { gone = true; };
  }, [path]);

  // The picture's own colours, as a palette: most used first.
  const palette = useMemo(() => {
    if (!img) return [] as string[];
    const n = new Map<string, number>();
    for (let i = 0; i < img.px.length; i += 4) {
      if (img.px[i + 3] < 8) continue;
      const k = `#${[img.px[i], img.px[i + 1], img.px[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
      n.set(k, (n.get(k) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 48);
  }, [img]);

  // Drawing to the canvas: the pixels over a checkerboard, and a grid when big enough.
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(4);
  useEffect(() => {
    const el = wrap.current;
    if (!el || !img) return;
    const read = () => setFitScale(Math.max(1, Math.floor((el.clientWidth - 2) / img.w)));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);
  const scale = zoom || fitScale;

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c || !img) return;
    const x = c.getContext("2d")!;
    c.width = img.w * scale; c.height = img.h * scale;
    x.imageSmoothingEnabled = false;
    // Checkerboard.
    for (let y = 0; y < img.h; y++) for (let xx = 0; xx < img.w; xx++) {
      x.fillStyle = (xx + y) % 2 ? "#2b2541" : "#241f37";
      x.fillRect(xx * scale, y * scale, scale, scale);
    }
    const tmp = document.createElement("canvas");
    tmp.width = img.w; tmp.height = img.h;
    tmp.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.px), img.w, img.h), 0, 0);
    x.drawImage(tmp, 0, 0, img.w * scale, img.h * scale);
    if (grid && scale >= 6) {
      x.strokeStyle = "rgba(255,255,255,.08)";
      x.lineWidth = 1;
      for (let i = 0; i <= img.w; i++) { x.beginPath(); x.moveTo(i * scale + 0.5, 0); x.lineTo(i * scale + 0.5, img.h * scale); x.stroke(); }
      for (let i = 0; i <= img.h; i++) { x.beginPath(); x.moveTo(0, i * scale + 0.5); x.lineTo(img.w * scale, i * scale + 0.5); x.stroke(); }
    }
  }, [img, scale, grid]);
  useEffect(() => { paint(); }, [paint]);

  // Edits.
  const snapshot = () => { if (!img) return; undo.current.push(new Uint8ClampedArray(img.px)); if (undo.current.length > MAX_UNDO) undo.current.shift(); redo.current = []; };
  const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const setPx = (px: Uint8ClampedArray, i: number, rgba: [number, number, number, number]) => { px[i] = rgba[0]; px[i + 1] = rgba[1]; px[i + 2] = rgba[2]; px[i + 3] = rgba[3]; };
  const at = (e: React.PointerEvent): [number, number] | null => {
    const c = canvas.current;
    if (!c || !img) return null;
    const r = c.getBoundingClientRect();
    const xx = Math.floor((e.clientX - r.left) / r.width * img.w), y = Math.floor((e.clientY - r.top) / r.height * img.h);
    return xx >= 0 && y >= 0 && xx < img.w && y < img.h ? [xx, y] : null;
  };
  const dab = (xx: number, y: number) => {
    if (!img) return;
    const i = (y * img.w + xx) * 4;
    if (tool === "pencil") { const [r, g, b] = hex(colour); if (img.px[i] === r && img.px[i + 1] === g && img.px[i + 2] === b && img.px[i + 3] === 255) return; setPx(img.px, i, [r, g, b, 255]); }
    else if (tool === "eraser") { if (!img.px[i + 3]) return; setPx(img.px, i, [0, 0, 0, 0]); }
    setDirty(true); paint(); bump((n) => n + 1);
  };
  const fill = (xx: number, y: number) => {
    if (!img) return;
    const { w, h, px } = img;
    const i0 = (y * w + xx) * 4;
    const from = [px[i0], px[i0 + 1], px[i0 + 2], px[i0 + 3]];
    const [r, g, b] = hex(colour);
    if (from[0] === r && from[1] === g && from[2] === b && from[3] === 255) return;
    const same = (i: number) => px[i] === from[0] && px[i + 1] === from[1] && px[i + 2] === from[2] && px[i + 3] === from[3];
    const stack = [[xx, y]];
    const seen = new Uint8Array(w * h);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const k = cy * w + cx;
      if (seen[k]) continue;
      seen[k] = 1;
      const i = k * 4;
      if (!same(i)) continue;
      setPx(px, i, [r, g, b, 255]);
      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < w - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < h - 1) stack.push([cx, cy + 1]);
    }
    setDirty(true); paint(); bump((n) => n + 1);
  };
  const pick = (xx: number, y: number) => {
    if (!img) return;
    const i = (y * img.w + xx) * 4;
    if (!img.px[i + 3]) return;
    setColour(`#${[img.px[i], img.px[i + 1], img.px[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
    setTool("pencil");
  };
  const down = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    const p = at(e);
    if (!p) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (tool === "pick") { pick(...p); return; }
    snapshot();
    if (tool === "fill") { fill(...p); return; }
    down.current = true;
    dab(...p);
  };
  const onMove = (e: React.PointerEvent) => { if (!down.current) return; const p = at(e); if (p) dab(...p); };
  const onUp = () => { down.current = false; };
  const doUndo = () => { if (!img || !undo.current.length) return; redo.current.push(new Uint8ClampedArray(img.px)); img.px.set(undo.current.pop()!); setDirty(true); paint(); bump((n) => n + 1); };
  const doRedo = () => { if (!img || !redo.current.length) return; undo.current.push(new Uint8ClampedArray(img.px)); img.px.set(redo.current.pop()!); setDirty(true); paint(); bump((n) => n + 1); };

  // The picture as a PNG, base64, for saving and for the preview.
  const toPng = useCallback(async () => {
    if (!img) return "";
    const c = document.createElement("canvas");
    c.width = img.w; c.height = img.h;
    c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.px), img.w, img.h), 0, 0);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, [img]);

  // The test face, redrawn a moment after each change.
  const [preview, setPreview] = useState<string>("");
  const previewTick = useRef(0);
  const [stroke, setStroke] = useState(0);
  useEffect(() => { if (!down.current) setStroke((n) => n + 1); }, [img, dirty]);
  useEffect(() => {
    if (mode !== "portrait" || !img || !path) return;
    const tick = ++previewTick.current;
    const t = window.setTimeout(async () => {
      const png = await toPng();
      const r = await fetch("/api/sprite/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cell: path.slice("portrait/".length).replace(/\.png$/, ""), png, skin, hair }) });
      if (!r.ok || tick !== previewTick.current) return;
      const url = URL.createObjectURL(await r.blob());
      setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, img, path, skin, hair, stroke]);

  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!img || !path) return;
    setBusy(true); setNote("");
    try {
      const png = await toPng();
      const r = await fetch("/api/sprite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, png }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message ?? j.code ?? "Could not save");
      setEdited((s) => new Set(s).add(path));
      setDirty(false);
      setNote("SAVED · IT IS LIVE");
    } catch (e) {
      setNote(`COULD NOT SAVE · ${e instanceof Error ? e.message : ""}`.toUpperCase());
    } finally { setBusy(false); }
  };
  const reset = async () => {
    if (!path || !window.confirm("Put the shipped sprite back, dropping the edit?")) return;
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/sprite", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.code ?? "Could not reset");
      setEdited((s) => { const n = new Set(s); n.delete(path); return n; });
      setLoadedFrom("");   // reload
      setNote("RESET · THE SHIPPED ONE IS BACK");
      // Reload the shipped picture.
      const rr = await fetch(`/api/sprite?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const bmp = await createImageBitmap(await rr.blob());
      const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
      const x = c.getContext("2d")!; x.drawImage(bmp, 0, 0);
      const d = x.getImageData(0, 0, bmp.width, bmp.height);
      setImg({ w: d.width, h: d.height, px: new Uint8ClampedArray(d.data) });
      undo.current = []; redo.current = []; setDirty(false);
    } catch (e) {
      setNote(`COULD NOT RESET · ${e instanceof Error ? e.message : ""}`.toUpperCase());
    } finally { setBusy(false); }
  };

  const sel: React.CSSProperties = { fontSize: 13, minHeight: 40 };
  const tb = (t: Tool, label: string) => (
    <button key={t} type="button" className={`btn btn-sm${tool === t ? " btn-purple" : ""}`} onClick={() => setTool(t)} aria-pressed={tool === t} style={{ minHeight: 40, flex: 1 }}>{label}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* What to draw on. */}
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className={`btn btn-sm${mode === "portrait" ? " btn-purple" : ""}`} onClick={() => setMode("portrait")} style={{ flex: 1, minHeight: 40 }}>PORTRAIT PARTS</button>
        <button type="button" className={`btn btn-sm${mode === "creature" ? " btn-purple" : ""}`} onClick={() => setMode("creature")} style={{ flex: 1, minHeight: 40 }}>HISTORIKALS</button>
      </div>
      {mode === "portrait" ? (
        <div style={{ display: "flex", gap: 6 }}>
          <select className="input" value={sheet} onChange={(e) => setSheet(e.target.value)} aria-label="Sheet" style={{ ...sel, flex: 1 }}>
            {sheets.map((s) => <option key={s.sheet} value={s.sheet}>{s.sheet}</option>)}
          </select>
          <select className="input" value={id} onChange={(e) => setId(e.target.value)} aria-label="Cell" style={{ ...sel, width: 96 }}>
            {ids.map((i) => <option key={i} value={i}>{i}{edited.has(`portrait/${sheet}/${i}.png`) ? " ✎" : ""}</option>)}
          </select>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6 }}>
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Historikal" style={{ ...sel, flex: 1 }}>
            {creatures.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <select className="input" value={file} onChange={(e) => setFile(e.target.value)} aria-label="Picture" style={{ ...sel, flex: 1 }}>
            {files.map((f) => <option key={f} value={f}>{f.slice(slug.length).replace(/^-/, "") || "base"}{edited.has(`creatures/${f}`) ? " ✎" : ""}</option>)}
          </select>
        </div>
      )}

      {/* The canvas, and the test face beside it when there is room. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div ref={wrap} style={{ flex: "1 1 240px", minWidth: 0, overflow: "auto", maxHeight: "60vh", background: "#1a1630", boxShadow: "0 0 0 1px var(--edge)" }}>
          {img ? (
            <canvas ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onContextMenu={(e) => e.preventDefault()} style={{ display: "block", touchAction: "none", cursor: tool === "pick" ? "crosshair" : "cell", imageRendering: "pixelated" }} />
          ) : (
            <div className="px" style={{ padding: 20, fontSize: 11, color: "var(--muted)" }}>{note || "LOADING"}</div>
          )}
        </div>
        {mode === "portrait" ? (
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
            {preview ? <img src={preview} alt="" width={128} height={128} style={{ display: "block", width: 128, height: 128, imageRendering: "pixelated", boxShadow: "0 0 0 1px var(--edge)" }} /> : <div style={{ width: 128, height: 128, background: "#1a1630" }} />}
            <div style={{ display: "flex", gap: 4 }}>
              <select className="input" value={skin} onChange={(e) => setSkin(e.target.value)} aria-label="Skin for the test face" style={{ ...sel, width: 60, background: skin, color: "#000" }}>
                {skins.map((s) => <option key={s} value={s} style={{ background: s }}>{s}</option>)}
              </select>
              <select className="input" value={hair} onChange={(e) => setHair(e.target.value)} aria-label="Hair colour for the test face" style={{ ...sel, width: 60, background: hair, color: "#fff" }}>
                {hairs.map((s) => <option key={s} value={s} style={{ background: s }}>{s}</option>)}
              </select>
            </div>
          </div>
        ) : img ? (
          <div style={{ flex: "0 0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <canvas ref={(c) => { if (!c || !img) return; c.width = img.w * 2; c.height = img.h * 2; const x = c.getContext("2d")!; x.imageSmoothingEnabled = false; const t = document.createElement("canvas"); t.width = img.w; t.height = img.h; t.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.px), img.w, img.h), 0, 0); x.drawImage(t, 0, 0, img.w * 2, img.h * 2); }} style={{ display: "block", imageRendering: "pixelated", background: "var(--blk-pur)" }} />
          </div>
        ) : null}
      </div>

      {/* Tools. */}
      <div style={{ display: "flex", gap: 4 }}>
        {tb("pencil", "PENCIL")}{tb("eraser", "ERASER")}{tb("fill", "FILL")}{tb("pick", "PICK")}
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input type="color" value={colour} onChange={(e) => setColour(e.target.value)} aria-label="Colour" style={{ width: 44, height: 40, padding: 0, border: 0, background: "none" }} />
        <span className="px" style={{ fontSize: 10, color: "var(--muted)", width: 64 }}>{colour.toUpperCase()}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-sm" onClick={() => setZoom((z) => Math.max(1, (z || fitScale) - 1))} style={{ minHeight: 40, minWidth: 40 }} aria-label="Zoom out">−</button>
        <button type="button" className="btn btn-sm" onClick={() => setZoom(0)} style={{ minHeight: 40 }}>FIT</button>
        <button type="button" className="btn btn-sm" onClick={() => setZoom((z) => Math.min(24, (z || fitScale) + 1))} style={{ minHeight: 40, minWidth: 40 }} aria-label="Zoom in">+</button>
        <button type="button" className={`btn btn-sm${grid ? " btn-purple" : ""}`} onClick={() => setGrid((g) => !g)} style={{ minHeight: 40 }}>GRID</button>
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {palette.map((c) => (
          <button key={c} type="button" onClick={() => { setColour(c); if (tool !== "fill") setTool("pencil"); }} aria-label={c} title={c} style={{ width: 24, height: 24, background: c, border: 0, boxShadow: colour === c ? "0 0 0 2px #fff" : "0 0 0 1px rgba(255,255,255,.2)", cursor: "pointer" }} />
        ))}
      </div>

      {/* Undo, save. */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button type="button" className="btn btn-sm" onClick={doUndo} disabled={!undo.current.length} style={{ minHeight: 40 }}>UNDO</button>
        <button type="button" className="btn btn-sm" onClick={doRedo} disabled={!redo.current.length} style={{ minHeight: 40 }}>REDO</button>
        <span style={{ flex: 1 }} />
        {path && edited.has(path) ? <button type="button" className="btn btn-sm" onClick={reset} disabled={busy} style={{ minHeight: 40 }}>RESET</button> : null}
        <button type="button" className="btn btn-sm btn-purple" onClick={save} disabled={busy || !img || !dirty} style={{ minHeight: 40 }}>SAVE</button>
      </div>
      <div className="px" style={{ fontSize: 10, color: note.startsWith("COULD") ? "#ff5a7a" : "var(--muted)", minHeight: 14 }}>
        {note || (path ? `${path}${edited.has(path) ? " · EDITED IN THE APP" : " · AS SHIPPED"}${loadedFrom && dirty ? " · UNSAVED CHANGES" : ""}` : "")}
      </div>
    </div>
  );
}
