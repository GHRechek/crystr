"use client";

import { useState } from "react";
import { BadgeGrid } from "@/components/badge-grid";
import type { ShownBadge } from "@/lib/badges";

export type BadgeTab = { label: string; count: string; items: ShownBadge[]; aside?: React.ReactNode };

/** The badge collection in two tabs, earned and tradable, each its own icon grid. */
export function BadgeTabs({ tabs }: { tabs: BadgeTab[] }) {
  const [at, setAt] = useState(0);
  const t = tabs[at];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="seg">
        {tabs.map((x, i) => (
          <button key={x.label} type="button" data-on={i === at} onClick={() => setAt(i)}>
            {x.label} · {x.items.length}
          </button>
        ))}
      </div>
      <BadgeGrid key={at} title={t.label} tone={at ? "var(--pur-soft)" : "var(--mag-soft)"} count={t.count} items={t.items} aside={t.aside} />
    </div>
  );
}
