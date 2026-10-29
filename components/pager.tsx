"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";

/** Tiles two across and six to a page, swiped or clicked through, carousel style. With a
 *  page or less it is just the grid. The tiles come ready-made from the server; this only
 *  lays them out and turns the pages. */
export function TilePager({ tiles, perPage = 6, label }: { tiles: ReactNode[]; perPage?: number; label: string }) {
  const pages: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += perPage) pages.push(tiles.slice(i, i + perPage));
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  // The track is as tall as the page it is showing, not the tallest page, so a short last
  // page does not leave a gap above the arrows.
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const fit = () => {
      const el = track.current?.children[page] as HTMLElement | undefined;
      if (el) setHeight(el.offsetHeight);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [page]);

  const grid = (items: ReactNode[]) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, alignContent: "start" }}>{items}</div>
  );
  if (pages.length <= 1) return grid(tiles);

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
      <div ref={track} className="pager-track" style={{ height }} onScroll={onScroll} role="group" aria-label={label}>
        {pages.map((p, i) => (
          <div key={i} className="pager-page">
            {grid(p)}
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
