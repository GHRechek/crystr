"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";

/** Tiles two across and six to a page, swiped or clicked through, carousel style. Every
 *  page is laid out on the same three-row grid, so a last page with two tiles keeps them
 *  where the top row sits on every other page and nothing below moves. With a page or
 *  less it is just the grid, as tall as its tiles. The tiles come ready-made from the
 *  server; this only lays them out and turns the pages. */
export function TilePager({ tiles, perPage = 6, label }: { tiles: ReactNode[]; perPage?: number; label: string }) {
  const pages: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += perPage) pages.push(tiles.slice(i, i + perPage));
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  if (pages.length <= 1) {
    return <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, alignContent: "start" }}>{tiles}</div>;
  }

  const rows = Math.ceil(perPage / 2);
  const go = (n: number) => {
    const el = track.current;
    if (!el) return;
    const to = Math.max(0, Math.min(pages.length - 1, n));
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
    setPage(to);
  };
  const onScroll = () => {
    const el = track.current;
    if (el && el.clientWidth) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <div ref={track} className="pager-track" onScroll={onScroll} role="group" aria-label={label}>
        {pages.map((p, i) => (
          <div key={i} className="pager-page">
            <div
              className="pager-grid"
              style={{ gridTemplateColumns: "repeat(2,1fr)", gridTemplateRows: `repeat(${rows},1fr)` }}
            >
              {p}
            </div>
          </div>
        ))}
      </div>
      <div className="pager-nav">
        <button type="button" className="btn btn-sm pager-btn" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous page">
          <ArrowIcon dir="left" />
        </button>
        <div className="pager-dots" aria-label={`Page ${page + 1} of ${pages.length}`}>
          {pages.map((_, i) => (
            <span key={i} className={`pager-dot${i === page ? " on" : ""}`} />
          ))}
        </div>
        <button type="button" className="btn btn-sm pager-btn" onClick={() => go(page + 1)} disabled={page === pages.length - 1} aria-label="Next page">
          <ArrowIcon dir="right" />
        </button>
      </div>
    </div>
  );
}
