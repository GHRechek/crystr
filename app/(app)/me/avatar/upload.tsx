"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePortrait, clearPortrait } from "@/lib/actions";

export function PortraitUpload({
  userId,
  current,
}: {
  userId: string;
  current: string | null;
}) {
  const [stage, setStage] = useState<"idle" | "uploading" | "failed">("idle");
  const [path, setPath] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setStage("uploading");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const key = `${userId}/portrait-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(key, file, {
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      console.error("portrait upload:", error.message);
      setStage("failed");
      return;
    }
    setPath(key);
    setStage("idle");
  }

  return (
    <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 9 }}>
      <div className="px" style={{ fontSize: 8.5, color: "var(--blu-soft)", letterSpacing: ".07em" }}>
        BRING YOUR OWN
      </div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--muted)" }}>
        Take one now, or bring one you drew or made somewhere else. Either
        replaces the built face everywhere.
      </div>

      {/* `capture` is all-or-nothing — with it the phone goes straight to the
          camera and the library is unreachable — so there are two inputs and
          two buttons. "user" is the front camera, which is where a face is. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />

      {path ? (
        <form action={savePortrait} style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <input type="hidden" name="path" value={path} />
          <span className="px" style={{ fontSize: 9, color: "var(--blu)", flex: 1 }}>
            ✓ READY
          </span>
          <button type="submit" className="btn btn-sm btn-blue">
            WEAR IT
          </button>
        </form>
      ) : stage === "uploading" ? (
        <button type="button" className="btn btn-sm" disabled>
          CARRYING IT OVER…
        </button>
      ) : (
        <>
          {stage === "failed" ? (
            <div className="px" style={{ fontSize: 9, color: "var(--mag-soft)" }}>
              IT DID NOT ARRIVE — TRY AGAIN
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 7 }}>
            <button
              type="button"
              className="btn btn-sm btn-purple"
              style={{ flex: 1 }}
              onClick={() => cameraRef.current?.click()}
            >
              ◉ TAKE A PHOTO
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ flex: 1 }}
              onClick={() => fileRef.current?.click()}
            >
              ▣ UPLOAD
            </button>
          </div>
        </>
      )}

      {current ? (
        <form action={clearPortrait}>
          <button type="submit" className="btn btn-sm btn-block">
            ✕ USE THE BUILT FACE INSTEAD
          </button>
        </form>
      ) : null}
    </div>
  );
}
