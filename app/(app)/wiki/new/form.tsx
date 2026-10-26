"use client";

import Link from "next/link";
import { useState } from "react";
import { createWikiPage } from "@/lib/wiki-actions";
import { slugify } from "@/lib/wiki-slug";

/** Start a page. The address follows the title until you type one of your own. */
export function NewPageForm({
  initialTitle = "",
  pages,
}: {
  initialTitle?: string;
  /** The pages this one could sit under. */
  pages: { id: number; title: string }[];
}) {
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
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
          A NEW PAGE
        </div>
      </div>

      <div className="banner-note banner-purple">
        The page starts as blurred text under its title. Anyone signed in can add something to
        the end of it, a few key words at a time, and you read what they add. What is kept shows
        up clear inside the blur, two facts to a paragraph.
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
        <label htmlFor="parent">UNDER</label>
        <select id="parent" name="parent" className="input" defaultValue="">
          <option value="">On its own</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <span className="flabel" style={{ color: "var(--muted)" }}>
          A PAGE CAN SIT UNDER ANOTHER, AS ORCS SIT UNDER MORDLS
        </span>
      </div>

      <input type="hidden" name="slots" value="6" />

      <button type="submit" className="btn btn-lg btn-purple btn-block">
        START THE PAGE
      </button>
    </form>
  );
}
