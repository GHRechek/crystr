"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendWhisper } from "@/lib/actions";
import { WHISPER_IMAGE_MAX, WHISPER_IMAGE_TYPES } from "@/lib/whisper";
import { Cost } from "@/components/mana";

/** The box at the bottom of a conversation: words, an optional picture, and, when
 *  you are answering something, which message that is. The picture goes straight to
 *  the private bucket when chosen; sending then names it. */
export function WhisperComposer({
  threadId,
  cost,
  replyTo,
  replyLine,
  closeReplyHref,
}: {
  threadId: number;
  cost: number;
  replyTo: number | null;
  replyLine: string | null;
  closeReplyHref: string;
}) {
  const [path, setPath] = useState("");
  const [thumb, setThumb] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function attach(file: File) {
    setProblem("");
    if (!WHISPER_IMAGE_TYPES.includes(file.type)) {
      setProblem("That kind of file will not go. Try a JPEG, PNG, WebP or GIF.");
      return;
    }
    if (file.size > WHISPER_IMAGE_MAX) {
      setProblem("That picture is over 5 MB. Try a smaller one.");
      return;
    }
    setBusy(true);
    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `${threadId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("whispers").upload(key, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    setBusy(false);
    if (error) {
      console.error("whisper picture:", error.message);
      setProblem("The picture did not arrive. Try again.");
      return;
    }
    setPath(key);
    setThumb(URL.createObjectURL(file));
  }

  function clear() {
    setPath("");
    if (thumb) URL.revokeObjectURL(thumb);
    setThumb("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      action={sendWhisper}
      style={{
        flex: "none",
        padding: "8px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--device)",
        position: "sticky",
        bottom: 0,
      }}
    >
      <input type="hidden" name="thread_id" value={threadId} />
      <input type="hidden" name="image_path" value={path} />
      {replyTo ? <input type="hidden" name="reply_to" value={replyTo} /> : null}

      {replyTo && replyLine ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 9px",
            fontSize: 12,
            color: "var(--muted)",
            boxShadow: "0 0 0 1px var(--edge)",
          }}
        >
          <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ↩ {replyLine}
          </span>
          <a href={closeReplyHref} aria-label="Cancel reply" className="px" style={{ fontSize: 11, color: "var(--dim)" }}>
            ✕
          </a>
        </div>
      ) : null}

      {thumb ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="Picture to send" style={{ height: 52, width: "auto", borderRadius: 4, boxShadow: "0 0 0 1px var(--edge)" }} />
          <button type="button" className="btn btn-sm" onClick={clear} style={{ minHeight: 40 }}>
            REMOVE
          </button>
        </div>
      ) : null}

      {problem ? (
        <div className="px" style={{ fontSize: 11, color: "var(--mag)", lineHeight: 1.7 }}>
          {problem.toUpperCase()}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <input
          ref={fileRef}
          type="file"
          accept={WHISPER_IMAGE_TYPES.join(",")}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void attach(f);
          }}
        />
        <button
          type="button"
          className="btn"
          aria-label="Add a picture"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          style={{ minHeight: 44, minWidth: 44, padding: 0 }}
        >
          {busy ? "…" : "▣"}
        </button>
        <input
          name="body" aria-label="Your whisper"
          className="input"
          style={{ flex: 1, fontSize: 13.5 }}
          placeholder="whisper"
          autoComplete="off"
          maxLength={2000}
        />
        <button type="submit" className="btn btn-blue" disabled={busy} style={{ minHeight: 44, minWidth: 56 }}>
          SEND <Cost n={cost} />
        </button>
      </div>
    </form>
  );
}
