"use client";

import { useState } from "react";

/** The two halves of the Quests page: what you can do, and what you hold. */
export function HubTabs({ quests, held, heldCount }: { quests: React.ReactNode; held: React.ReactNode; heldCount: number }) {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="seg">
        <button type="button" data-on={tab === 0} onClick={() => setTab(0)}>QUESTS</button>
        <button type="button" data-on={tab === 1} onClick={() => setTab(1)}>HELD BADGES · {heldCount}</button>
      </div>
      <div style={{ display: tab === 0 ? "flex" : "none", flexDirection: "column", gap: 18 }}>{quests}</div>
      <div style={{ display: tab === 1 ? "block" : "none" }}>{held}</div>
    </div>
  );
}
