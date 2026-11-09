"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPost, voiceLocked } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";

/** Pictures on posts: a JPEG, PNG, WebP, HEIC or GIF up to 10 MB, the proofs bucket's own rules. */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
const IMAGE_MAX = 10 * 1024 * 1024;

export function Composer({ userId, mana, badge }: { userId: string; mana: number; badge?: { slug: string; title: string; how: string } }) {
  const [text, setText] = useState("");
  // The picture goes up as soon as it is chosen, into this person's own folder of the proofs bucket;
  // publishing then names it. `photo` is true from the moment one is chosen, so the price shows at once.
  const [path, setPath] = useState("");
  const [thumb, setThumb] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const photo = !!path || busy;

  async function attach(file: File) {
    setProblem("");
    if (file.type && !IMAGE_TYPES.includes(file.type)) {
      setProblem("That kind of file will not go. Try a JPEG, PNG, WebP or GIF.");
      return;
    }
    if (file.size > IMAGE_MAX) {
      setProblem("That picture is over 10 MB. Try a smaller one.");
      return;
    }
    if (thumb) URL.revokeObjectURL(thumb);
    setThumb(URL.createObjectURL(file));
    setBusy(true);
    const ext = file.type === "image/jpeg" ? "jpg" : (file.type.split("/")[1] || file.name.split(".").pop() || "jpg");
    const key = `${userId}/post-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("proofs").upload(key, file, { contentType: file.type || undefined, cacheControl: "3600", upsert: false });
    setBusy(false);
    if (error) {
      console.error("post picture:", error.message);
      setProblem("The picture did not arrive. Try again.");
      clear();
      return;
    }
    setPath(key);
  }

  function clear() {
    setPath("");
    if (thumb) URL.revokeObjectURL(thumb);
    setThumb("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const cost = COSTS.post + (photo ? COSTS.photo : 0);
  const affordable = mana >= cost;
  const canPublish = affordable && text.trim().length > 0 && !busy;

  return (
    <form action={createPost} className="pad">
      <input type="hidden" name="image_path" value={path} />
      {badge ? <input type="hidden" name="badge" value={badge.slug} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/" className="btn btn-sm">
          ✕ CLOSE
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
          THIS WILL COST
        </div>
        <div
          className="px"
          style={{ fontSize: 14, color: affordable ? "var(--blu-soft)" : "var(--mag)" }}
        >
          -{cost}
        </div>
      </div>

      {badge ? (
        <div className="tile" style={{ padding: 12 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--pur-soft)" }}>
            BADGE REQUEST · {badge.title.toUpperCase()}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-3)", marginTop: 4 }}>{badge.how}</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--muted)", marginTop: 4 }}>
            Poems and pictures are a good way to get a witch's attention! It is marked as a badge request, and when a witch likes it, the badge is yours.
          </div>
        </div>
      ) : null}

      <textarea
        name="body" aria-label="Your post"
        className="textarea"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="say something"
      />

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void attach(f); }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {path || busy ? (
          <button type="button" className="btn" onClick={clear} disabled={busy}>
            ✕ REMOVE IMAGE
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              ▣ ATTACH IMAGE <Cost n={COSTS.photo} />
            </button>
            <button type="button" className="btn" onClick={() => cameraRef.current?.click()} aria-label="Take a photo">
              ◉ CAMERA
            </button>
          </>
        )}
        <button type="submit" formAction={voiceLocked} className="btn" style={{ color: "var(--muted)" }}>
          ♪ VOICE — LOCKED
        </button>
      </div>

      {thumb ? (
        // The picture as it will show on the card, in the CRYSTR frame.
        <div className="crystr-frame" style={{ opacity: busy ? 0.6 : 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="The picture you are attaching" style={{ display: "block", width: "100%", maxHeight: 320, objectFit: "contain", background: "var(--inset)" }} />
        </div>
      ) : null}
      {busy ? <div className="px" style={{ fontSize: 10, color: "var(--muted)" }}>SENDING THE PICTURE…</div> : null}
      {problem ? <div className="px" style={{ fontSize: 10, color: "var(--mag)" }}>{problem.toUpperCase()}</div> : null}

      {affordable ? null : (
        <div
          className="tile"
          style={{ padding: "11px 12px", fontSize: 12, lineHeight: 1.55, color: "var(--muted)" }}
        >
          Not enough mana for this yet. The Well is accepting poems, photographs and two minutes of your silence.
        </div>
      )}

      <button
        type="submit"
        className={`btn btn-lg btn-block${canPublish ? " btn-mag" : ""}`}
        aria-disabled={!canPublish}
      >
        {canPublish
          ? (
            <>
              PUBLISH <Cost n={cost} />
            </>
          )
          : !affordable
            ? "REST FIRST"
            : busy
              ? "SENDING THE PICTURE…"
              : "WRITE SOMETHING"}
      </button>
    </form>
  );
}
