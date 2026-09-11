"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePortrait, clearPortrait } from "@/lib/actions";

/** Picrew can't be embedded — it refuses framing, and using it as this app's
 *  infrastructure isn't ours to do. Linking out is the supported shape: they
 *  make the face on the creator's own page, on the creator's terms, and bring
 *  the image back. */
const PICREW = "https://picrew.me/en/image_maker/1698802";

export function PortraitUpload({
  userId,
  current,
}: {
  userId: string;
  current: string | null;
}) {
  const [stage, setStage] = useState<"idle" | "uploading" | "failed">("idle");
  const [path, setPath] = useState("");
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
        Make one on Picrew, save the image, and bring it back here. It replaces
        the built face everywhere. Check the maker&apos;s own usage terms —
        they vary by creator, and only you can agree to them.
      </div>

      <a
        href={PICREW}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-purple"
      >
        ◈ MAKE ONE ON PICREW ↗
      </a>

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
      ) : (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => fileRef.current?.click()}
          disabled={stage === "uploading"}
        >
          {stage === "uploading"
            ? "CARRYING IT OVER…"
            : stage === "failed"
              ? "IT DID NOT ARRIVE — TRY AGAIN"
              : "▣ UPLOAD A PORTRAIT"}
        </button>
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
