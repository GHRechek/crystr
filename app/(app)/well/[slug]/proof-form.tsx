"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitQuest } from "@/lib/actions";
import { untilReady } from "@/lib/crystr";
import type { Quest } from "@/lib/data";
import { StillTimer } from "./still-timer";
import { Gain } from "@/components/mana";
import { DrawingPad } from "./drawing-pad";

type Stage = "empty" | "uploading" | "attached" | "failed";

export function ProofForm({ quest, userId }: { quest: Quest; userId: string }) {
  const [stage, setStage] = useState<Stage>("empty");
  const [path, setPath] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [timerDone, setTimerDone] = useState(false);

  const waiting = !!quest.ready_at;
  const timed = !!quest.timer_seconds;
  const drawing = quest.drawing_pad;
  // Where a picture is required, words are not an option at all.
  const wordsOk = !timed && !quest.proof_required;
  // Quests meant to be done in the moment (a poem): the writing box leads, a photo is the backup.
  const textFirst = quest.text_first && wordsOk;
  const hasProof = timed ? timerDone : stage === "attached" || (wordsOk && note.trim().length >= 12);

  async function upload(file: File) {
    setStage("uploading");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
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
      label: "ON ITS WAY TO THE WELL",
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
        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-.02em",
            lineHeight: 1.15,
            marginBottom: 8,
          }}
        >
          {quest.title}
        </h1>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--dim)", textWrap: "pretty" }}>
          {quest.blurb}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div className="tile" style={{ flex: 1 }}>
          <div className="flabel" style={{ marginBottom: 5 }}>
            RESTORES
          </div>
          <div className="px" style={{ fontSize: 16, color: "var(--blu-soft)" }}>
            <Gain n={quest.reward} />
          </div>
        </div>
        <div className="tile" style={{ flex: 1 }}>
          <div className="flabel" style={{ marginBottom: 5 }}>
            TAKES YOU
          </div>
          <div className="px" style={{ fontSize: 16, color: "var(--mag-soft)" }}>
            {quest.time_label}
          </div>
        </div>
      </div>

      {waiting ? (
        <div className="banner-note banner-mag">
          You brought this one in recently. It will be ready again in {untilReady(quest.ready_at!)}.
        </div>
      ) : null}

      {timed ? (
        <StillTimer slug={quest.slug} seconds={quest.timer_seconds!} onDone={setTimerDone} />
      ) : (
        <>
      {textFirst ? (
        <div className="field">
          <label htmlFor="note">WRITE IT HERE, RIGHT NOW</label>
          <textarea
            id="note"
            name="note"
            className="textarea"
            rows={9}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={quest.write_prompt ?? "Write it here, in the moment."}
            style={{ fontSize: 16, lineHeight: 1.5 }}
          />
        </div>
      ) : null}

      {drawing && stage === "attached" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Your drawing, ready to hand in"
            style={{ width: "100%", borderRadius: "var(--px-r)", boxShadow: "0 0 0 2px var(--blu)" }}
          />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setStage("empty");
              setPath("");
              if (preview) URL.revokeObjectURL(preview);
              setPreview("");
            }}
            style={{ alignSelf: "flex-start" }}
          >
            ↶ DRAW IT AGAIN
          </button>
        </div>
      ) : null}

      {drawing && stage !== "attached" ? (
        <>
          <DrawingPad onDone={(f) => void upload(f)} disabled={stage === "uploading"} />
          <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            OR PHOTOGRAPH A DRAWING YOU MADE ON PAPER
          </div>
        </>
      ) : null}

      {drawing && stage === "attached" ? null : (
        <>
      {/* Two inputs, because `capture` is all-or-nothing: with it the phone
          opens straight into the camera and the library is unreachable,
          without it you only ever get the library. The tile is the camera —
          proof-of-artifact is meant to be taken there and then. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
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

      {textFirst ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="px" style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
            OR ADD A PHOTO INSTEAD
          </div>
          {stage === "attached" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
                ✓ PHOTO ATTACHED
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setStage("empty");
                  setPath("");
                }}
              >
                REMOVE
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-sm" onClick={() => cameraRef.current?.click()} disabled={stage === "uploading"}>
                ▣ TAKE A PHOTO
              </button>
              <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={stage === "uploading"}>
                CHOOSE ONE YOU TOOK
              </button>
            </div>
          )}
          {stage === "uploading" ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>On its way to the Well…</div>
          ) : stage === "failed" ? (
            <div style={{ fontSize: 12, color: "var(--mag-soft)" }}>It did not arrive. Try again, or just write it above.</div>
          ) : null}
        </div>
      ) : (
        <>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
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
          style={{ fontSize: 11, color: "var(--dim)", textAlign: "center", lineHeight: 1.7 }}
        >
          {zone.label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            textAlign: "center",
            lineHeight: 1.45,
            maxWidth: 230,
          }}
        >
          {zone.hint}
        </div>
      </button>

      <button
        type="button"
        className="btn btn-sm"
        style={{ alignSelf: "flex-start" }}
        onClick={() => fileRef.current?.click()}
      >
        ▣ OR CHOOSE ONE YOU ALREADY TOOK
      </button>
        </>
      )}

        </>
      )}

      {wordsOk && !textFirst ? (
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
      ) : null}

        </>
      )}

      <button
        type="submit"
        className={`btn btn-lg btn-block${hasProof && !waiting ? " btn-blue" : ""}`}
        aria-disabled={!hasProof || waiting}
      >
        {waiting
          ? `AVAILABLE IN ${untilReady(quest.ready_at!)}`
          : hasProof
            ? timed
              ? `TAKE IT · +${quest.reward}`
              : `SUBMIT PROOF · +${quest.reward}`
            : timed
              ? "FINISH THE TIMER FIRST"
              : drawing
              ? "ADD YOUR DRAWING FIRST"
              : textFirst
                ? "WRITE SOMETHING FIRST"
                : "ATTACH PROOF FIRST"}
      </button>
    </form>
  );
}
