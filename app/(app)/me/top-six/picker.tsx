"use client";

import { useState } from "react";
import { setTopFriends } from "@/lib/actions";
import { Avatar } from "@/components/bits";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";
import type { Author } from "@/lib/data";

/** Order matters and is the order you pick them in — which is the whole
 *  social hazard of a Top 6, and why it costs four mana to change. A search
 *  box narrows the City to the person you have in mind. */
export function TopSixPicker({
  people,
  current,
}: {
  people: Author[];
  current: string[];
}) {
  const [picked, setPicked] = useState<string[]>(current);
  const [q, setQ] = useState("");

  const changed =
    picked.length !== current.length || picked.some((id, i) => current[i] !== id);

  function toggle(id: string) {
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= 6 ? p : [...p, id],
    );
  }

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? people.filter((p) => p.handle.toLowerCase().includes(needle) || (p.display_name ?? "").toLowerCase().includes(needle))
    : people;
  const chosen = picked.map((id) => people.find((p) => p.id === id)).filter((p): p is Author => !!p);

  return (
    <form action={setTopFriends} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {picked.map((id) => (
        <input key={id} type="hidden" name="friend" value={id} />
      ))}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <div className="px" style={{ fontSize: 12, color: "var(--blu-soft)" }}>
          PICKED
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {picked.length}/6
        </div>
      </div>
      {chosen.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chosen.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className="btn btn-sm"
              style={{ minHeight: 40, gap: 6, display: "inline-flex", alignItems: "center" }}
              aria-label={`Take ${p.handle} out`}
            >
              <span className="px" style={{ fontSize: 10, color: "var(--pur-bright)" }}>
                #{i + 1}
              </span>
              {p.handle} ×
            </button>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Nobody yet. Who should be first?</div>
      )}

      <div className="field" style={{ marginTop: 6 }}>
        <label htmlFor="who">WHO ELSE?</label>
        <input
          id="who"
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type a username"
          autoComplete="off"
        />
      </div>

      {shown.map((p) => {
        const at = picked.indexOf(p.id);
        const on = at >= 0;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            className="rowcard"
            style={{
              minHeight: 52,
              borderColor: on ? "var(--pur)" : "var(--edge)",
              background: on ? "rgba(145,132,217,.14)" : "var(--surface)",
            }}
          >
            <Avatar person={p} size={28} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
              {p.handle}
              {p.display_name ? <span style={{ color: "var(--muted)" }}> · {p.display_name}</span> : null}
            </div>
            <div
              className="px"
              style={{ fontSize: 11, color: on ? "var(--pur-bright)" : "var(--muted)" }}
            >
              {on ? `#${at + 1}` : "+"}
            </div>
          </button>
        );
      })}

      {people.length === 0 ? (
        <div className="empty">NOBODY TO RANK YET</div>
      ) : shown.length === 0 ? (
        <div className="empty">NOBODY BY THAT NAME</div>
      ) : null}

      {people.length ? (
        <button
          type="submit"
          className={`btn btn-lg btn-block${changed ? " btn-mag" : ""}`}
          aria-disabled={!changed}
        >
          {changed ? (
            <>
              SAVE THE TOP 6 <Cost n={COSTS.topSix} />
            </>
          ) : (
            "TOP 6 UNCHANGED"
          )}
        </button>
      ) : null}
    </form>
  );
}
