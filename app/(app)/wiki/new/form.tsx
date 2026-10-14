"use client";

import Link from "next/link";
import { useState } from "react";
import { createWikiPage } from "@/lib/wiki-actions";
import { slugify } from "@/lib/wiki-slug";

/** Start a page. The address follows the title until you type one of your own. */
export function NewPageForm({ initialTitle = "" }: { initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState("");
  const [custom, setCustom] = useState(false);
  const shown = custom ? slug : slugify(title);

  return (
    <form action={createWikiPage} className="pad" style={{ gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/wiki" className="btn btn-sm">
          ✕ DISCARD
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--pur-pale)" }}>
          A NEW PAGE
        </div>
      </div>

      <div className="banner-note banner-purple">
        The page starts as blurred text with gaps in it. Anyone signed in can add a few key
        words to a gap, and you read what they add. Pick the title and how many gaps to start
        with; more open up as facts are kept.
      </div>

      <div className="field">
        <label htmlFor="title">TITLE</label>
        <input
          id="title"
          name="title"
          className="input"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="The Low Market"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="slug">ADDRESS</label>
        <input
          id="slug"
          name="slug"
          className="input"
          maxLength={60}
          value={shown}
          onChange={(e) => {
            setCustom(true);
            setSlug(e.target.value.toLowerCase());
          }}
          placeholder="the-low-market"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
        />
        <span className="flabel" style={{ color: "var(--muted)" }}>
          /wiki/{shown || "…"} · LOWERCASE, NUMBERS, SINGLE DASHES
        </span>
      </div>

      <div className="field">
        <label htmlFor="slots">GAPS TO START WITH</label>
        <input id="slots" name="slots" type="number" className="input" min={2} max={60} defaultValue={6} required />
        <span className="flabel" style={{ color: "var(--muted)" }}>
          EACH GAP TAKES ONE FACT. THERE ARE ALWAYS AT LEAST TWO OPEN.
        </span>
      </div>

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        START THE PAGE
      </button>
    </form>
  );
}
