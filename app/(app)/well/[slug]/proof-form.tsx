"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitQuest } from "@/lib/actions";
import { untilReady } from "@/lib/crystr";
import type { Quest } from "@/lib/data";

type Stage = "empty" | "uploading" | "attached" | "failed";

export function ProofForm({ quest, userId }: { quest: Quest; userId: string }) {
  const [stage, setStage] = useState<Stage>("empty");
  const [path, setPath] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const waiting = !!quest.ready_at;
  const hasProof = stage === "attached" || note.trim().length >= 12;

  async function upload(file: File) {
    setStage("uploading");
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const key = `${userId}/${quest.slug}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("proofs").upload(key, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      console.error("proof upload:", error.message);
      setStage("failed");
      return;
    }
    setPath(key);
    setStage("attached");
  }

  const zone = {
    empty: {
      glyph: "＋",
      glyphColor: "var(--pur-soft)",
      border: "var(--edge-hover)",
      label: quest.proof_label,
      hint: quest.proof_hint,
    },
    uploading: {
      glyph: "◷",
      glyphColor: "var(--pur-soft)",
      border: "var(--pur)",
      label: "CARRYING IT TO THE WELL",
      hint: "Hold on.",
    },
    attached: {
      glyph: "✓",
      glyphColor: "var(--blu)",
      border: "var(--blu)",
      label: "PROOF ATTACHED",
      hint: "Held for review. A witch will look at this, eventually, unkindly.",
    },
    failed: {
      glyph: "✕",
      glyphColor: "var(--mag)",
      border: "var(--mag-edge)",
      label: "IT DID NOT ARRIVE",
      hint: "Try again, or write down what you did instead.",
    },
  }[stage];

  return (
    <form action={submitQuest} className="pad" style={{ gap: 14 }}>
      <input type="hidden" name="slug" value={quest.slug} />
      <input type="hidden" name="proof_url" value={path} />

      <Link href="/well" className="btn btn-sm" style={{ alignSelf: "flex-start" }}>
        ← THE WELL
      </Link>

      <div>
        <div className="kicker" style={{ color: "var(--mag)", display: "block", marginBottom: 8 }}>
          {quest.kicker}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-.02em",
            lineHeight: 1.15,
            marginBottom: 8,
          }}
        >
          {quest.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--dim)", textWrap: "pretty" }}>
          {quest.blurb}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="tile" style={{ flex: 1 }}>
          <div className="flabel" style={{ marginBottom: 5 }}>
            PAYS
          </div>
          <div className="px" style={{ fontSize: 16, color: "var(--blu-soft)" }}>
            +{quest.reward}
          </div>
        </div>
        <div className="tile" style={{ flex: 1 }}>
          <div className="flabel" style={{ marginBottom: 5 }}>
            COSTS YOU
          </div>
          <div className="px" style={{ fontSize: 16, color: "var(--mag-soft)" }}>
            {quest.time_label}
          </div>
        </div>
      </div>

      {waiting ? (
        <div className="banner-note banner-mag">
          You brought this one in recently. The well pays for effort, not for
          repetition — come back in {untilReady(quest.ready_at!)}.
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="placeholder"
        style={{
          minHeight: 150,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          padding: 18,
          border: 0,
          boxShadow: `inset 0 0 0 2px ${zone.border}`,
        }}
      >
        <div className="px" style={{ fontSize: 20, color: zone.glyphColor }}>
          {zone.glyph}
        </div>
        <div
          className="px"
          style={{ fontSize: 9, color: "var(--dim)", textAlign: "center", lineHeight: 1.7 }}
        >
          {zone.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted)",
            textAlign: "center",
            lineHeight: 1.45,
            maxWidth: 230,
          }}
        >
          {zone.hint}
        </div>
      </button>

      <div className="field">
        <label htmlFor="note">OR WRITE IT DOWN — WHAT YOU DID, IN YOUR WORDS</label>
        <textarea
          id="note"
          name="note"
          className="textarea textarea-sub"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For the quests whose artifact is a sentence rather than a photograph."
        />
      </div>

      <button
        type="submit"
        className={`btn btn-lg btn-block${hasProof && !waiting ? " btn-blue" : ""}`}
        aria-disabled={!hasProof || waiting}
      >
        {waiting
          ? `AVAILABLE IN ${untilReady(quest.ready_at!)}`
          : hasProof
            ? `SUBMIT PROOF · +${quest.reward}`
            : "ATTACH PROOF FIRST"}
      </button>
    </form>
  );
}
