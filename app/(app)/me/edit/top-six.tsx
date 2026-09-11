"use client";

import { useState } from "react";
import { setTopFriends } from "@/lib/actions";
import { Avatar } from "@/components/bits";
import { COSTS } from "@/lib/crystr";
import type { Author } from "@/lib/data";

/** Order matters and is the order you pick them in — which is the whole
 *  social hazard of a Top 6, and why it costs four mana to change. */
export function TopSixPicker({
  people,
  current,
}: {
  people: Author[];
  current: string[];
}) {
  const [picked, setPicked] = useState<string[]>(current);

  const changed =
    picked.length !== current.length || picked.some((id, i) => current[i] !== id);

  function toggle(id: string) {
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length >= 6 ? p : [...p, id],
    );
  }

  return (
    <form action={setTopFriends} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {picked.map((id) => (
        <input key={id} type="hidden" name="friend" value={id} />
      ))}

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <div className="px" style={{ fontSize: 11, color: "var(--blu-soft)" }}>
          TOP 6
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
          {picked.length}/6 picked · {COSTS.topSix} mana to change
        </div>
      </div>

      {people.map((p) => {
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
            <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>{p.handle}</div>
            <div
              className="px"
              style={{ fontSize: 10, color: on ? "var(--pur-bright)" : "var(--muted)" }}
            >
              {on ? `#${at + 1}` : "—"}
            </div>
          </button>
        );
      })}

      {people.length === 0 ? (
        <div className="empty">NOBODY TO RANK YET</div>
      ) : (
        <button
          type="submit"
          className={`btn btn-lg btn-block${changed ? " btn-mag" : ""}`}
          aria-disabled={!changed}
        >
          {changed ? `SAVE THE TOP 6 · -${COSTS.topSix}` : "TOP 6 UNCHANGED"}
        </button>
      )}
    </form>
  );
}
