"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveAvatar } from "@/lib/actions";
import {
  AVATAR_CREDIT,
  COLOR_GROUPS,
  SHAPE_GROUPS,
  avatarSvg,
  randomAvatar,
  type AvatarConfig,
} from "@/lib/avatar";

export function AvatarBuilder({ start, fresh }: { start: AvatarConfig; fresh: boolean }) {
  const [c, setC] = useState<AvatarConfig>(start);

  const preview = useMemo(() => avatarSvg(c, 168), [c]);

  const step = (key: string, values: string[], by: number) =>
    setC((prev) => {
      const list = values;
      const at = Math.max(0, list.indexOf(prev[key]));
      const next = (((at + by) % list.length) + list.length) % list.length;
      return { ...prev, [key]: list[next] };
    });

  return (
    <form action={saveAvatar} className="pad" style={{ gap: 12 }}>
      <input type="hidden" name="config" value={JSON.stringify(c)} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--muted)" }}>
          A FACE COSTS NOTHING
        </div>
      </div>

      {/* Sticks to the top of the screen so the face stays in view while you
          work down the options — otherwise every change is a scroll away. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          padding: "8px 0 10px",
          margin: "0 -16px",
          paddingInline: 16,
          background: "var(--device)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            flex: "none",
            boxShadow: "0 0 0 1px var(--edge)",
            borderRadius: "var(--px-r)",
            overflow: "hidden",
            lineHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
          <button type="button" className="btn btn-sm" onClick={() => setC(randomAvatar())}>
            ⟳ SOMEONE ELSE
          </button>
          <button type="submit" className="btn btn-sm btn-purple">
            WEAR THIS FACE
          </button>
        </div>
      </div>

      {fresh ? (
        <div className="banner-note banner-purple">
          Nobody has a face here until they make one. Yours shows up on every post,
          whisper and byline you pay for.
        </div>
      ) : null}

      {COLOR_GROUPS.map((row) => (
        <div className="field" key={row.key}>
          <span className="flabel">{row.label}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {row.values.map((col) => (
              <button
                key={col}
                type="button"
                aria-label={`${row.label} ${col}`}
                aria-pressed={c[row.key] === col}
                onClick={() => setC((p) => ({ ...p, [row.key]: col }))}
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  cursor: "pointer",
                  background: `#${col}`,
                  borderRadius: "var(--px-r)",
                  border:
                    c[row.key] === col ? "2px solid var(--pur-bright)" : "1px solid var(--edge)",
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {SHAPE_GROUPS.map((g) => {
        const list = g.optional ? ["none", ...g.values] : g.values;
        const at = Math.max(0, list.indexOf(c[g.key]));
        return (
          <div
            key={g.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--rule-soft)",
            }}
          >
            <div className="px" style={{ fontSize: 9, color: "var(--dim)", flex: 1 }}>
              {g.label}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(g.key, list, -1)}
              aria-label={`${g.label} previous`}
            >
              ◀
            </button>
            <div
              className="px"
              style={{ fontSize: 9, color: "var(--muted)", width: 44, textAlign: "center" }}
            >
              {c[g.key] === "none" ? "NONE" : `${at + 1}/${list.length}`}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ minWidth: 38 }}
              onClick={() => step(g.key, list, 1)}
              aria-label={`${g.label} next`}
            >
              ▶
            </button>
          </div>
        );
      })}

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        WEAR THIS FACE
      </button>

      <div className="empty" style={{ paddingTop: 2, lineHeight: 1.7 }}>
        {AVATAR_CREDIT.style.toUpperCase()} BY {AVATAR_CREDIT.creator.toUpperCase()} ·{" "}
        {AVATAR_CREDIT.license}
      </div>
    </form>
  );
}
