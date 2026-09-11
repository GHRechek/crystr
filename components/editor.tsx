"use client";

import Link from "next/link";
import { useState } from "react";
import { saveDispatch, submitOpEd } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import type { Article } from "@/lib/data";

export function Editor({
  kind,
  article,
}: {
  kind: "dispatch" | "oped";
  article?: Article | null;
}) {
  const [headline, setHeadline] = useState(article?.headline ?? "");
  const [banner, setBanner] = useState(article?.banner ?? false);
  const oped = kind === "oped";
  const ready = headline.trim().length > 0;

  return (
    <form action={oped ? submitOpEd : saveDispatch} className="pad" style={{ gap: 11 }}>
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      <input type="hidden" name="banner" value={banner ? "true" : "false"} />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/ball" className="btn btn-sm">
          ✕ DISCARD
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 9, color: "var(--pur-pale)" }}>
          {oped ? "OP-ED · FOR REVIEW" : article ? "EDITING DISPATCH" : "NEW DISPATCH"}
        </div>
      </div>

      {oped ? (
        <div className="banner-note banner-mag">
          Op-eds cost {COSTS.oped} mana to file and go to a witch before anyone else sees
          them. They can publish it, or return it without comment.
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="kicker">KICKER</label>
        <input
          id="kicker"
          name="kicker"
          className="input input-px"
          defaultValue={article?.kicker ?? ""}
          placeholder={oped ? "OP-ED" : "CITY NOTICE"}
        />
      </div>

      <div className="field">
        <label htmlFor="headline">HEADLINE</label>
        <textarea
          id="headline"
          name="headline"
          className="textarea textarea-title"
          rows={2}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Say the thing plainly"
        />
      </div>

      <div className="field">
        <label htmlFor="standfirst">STANDFIRST</label>
        <textarea
          id="standfirst"
          name="standfirst"
          className="textarea textarea-sub"
          rows={2}
          defaultValue={article?.standfirst ?? ""}
          placeholder="One sentence for people who will not read the rest"
        />
      </div>

      <div className="field">
        <label htmlFor="body">BODY — BLANK LINE BETWEEN PARAGRAPHS</label>
        <textarea
          id="body"
          name="body"
          className="textarea"
          rows={9}
          defaultValue={article?.body ?? ""}
          style={{ fontSize: 13.5, lineHeight: 1.6 }}
          placeholder="The dispatch itself."
        />
      </div>

      <button
        type="button"
        className={`btn${banner ? " btn-purple" : ""}`}
        onClick={() => setBanner((b) => !b)}
      >
        ▣ {banner ? "BANNER ATTACHED" : "ATTACH BANNER IMAGE"}
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        {!oped ? (
          <button
            type="submit"
            name="status"
            value="draft"
            className="btn btn-lg"
            style={{ flex: 1, fontSize: 10 }}
          >
            SAVE DRAFT
          </button>
        ) : null}

        <button
          type="submit"
          name="status"
          value="published"
          className={`btn btn-lg${ready ? " btn-blue" : ""}`}
          style={{ flex: 1, fontSize: 10 }}
          aria-disabled={!ready}
        >
          {oped ? `SUBMIT FOR REVIEW · -${COSTS.oped}` : "PUBLISH TO THE CITY"}
        </button>
      </div>
    </form>
  );
}
