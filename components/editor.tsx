"use client";

import Link from "next/link";
import { useState } from "react";
import { saveDispatch, submitOpEd } from "@/lib/actions";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";
import type { Article } from "@/lib/data";
import { IconPicker } from "@/components/icon-picker";

export function Editor({
  kind,
  article,
}: {
  kind: "dispatch" | "oped";
  article?: Article | null;
}) {
  const [headline, setHeadline] = useState(article?.headline ?? "");
  const oped = kind === "oped";
  const ready = headline.trim().length > 0;

  return (
    <form action={oped ? submitOpEd : saveDispatch} className="pad" style={{ gap: 11 }}>
      {article ? <input type="hidden" name="id" value={article.id} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/ball" className="btn btn-sm">
          ✕ DISCARD
        </Link>
        <div className="spacer" />
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
          {oped ? "OP-ED · FOR REVIEW" : article ? "EDITING DISPATCH" : "NEW DISPATCH"}
        </div>
      </div>

      {oped ? (
        <div className="banner-note banner-mag">
          An op-ed goes to a witch before anyone else sees it. They can publish it or send it back.
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

      {!oped ? (
        <div className="field">
          <label htmlFor="byline">PUBLISHED BY — BLANK RUNS IT UNDER YOUR OWN NAME</label>
          <input
            id="byline"
            name="byline"
            className="input input-px"
            defaultValue={article?.byline_name ?? ""}
            maxLength={60}
            placeholder="THE HARBOUR OFFICE"
          />
        </div>
      ) : null}

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
        <label htmlFor="standfirst">HIGHLIGHT</label>
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

      {/* The picture goes first in the article, below the highlight, half the width. */}
      <IconPicker name="banner_icon" initial={article?.banner_icon} />

      <div style={{ display: "flex", gap: 8 }}>
        {!oped ? (
          <button
            type="submit"
            name="status"
            value="draft"
            className="btn btn-lg"
            style={{ flex: 1, fontSize: 11 }}
          >
            SAVE DRAFT
          </button>
        ) : null}

        <button
          type="submit"
          name="status"
          value="published"
          className={`btn btn-lg${ready ? " btn-blue" : ""}`}
          style={{ flex: 1, fontSize: 11 }}
          aria-disabled={!ready}
        >
          {oped ? (
            <>
              SUBMIT FOR REVIEW <Cost n={COSTS.oped} />
            </>
          ) : (
            "PUBLISH TO THE CITY"
          )}
        </button>
      </div>
    </form>
  );
}
