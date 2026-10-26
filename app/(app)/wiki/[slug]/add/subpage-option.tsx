"use client";

import { useState } from "react";
import { addSubpage } from "@/lib/wiki-actions";
import { slugify } from "@/lib/wiki-slug";
import { COSTS } from "@/lib/crystr";
import { Cost } from "@/components/mana";

/** The other thing a few words can be: the first fact of a new page under this one, for
 *  40 mana. Tick it and the form asks for the page's name and the button changes; the
 *  words typed above go with it. */
export function SubpageOption({
  parentTitle,
  canAddFact,
  canStartPage,
}: {
  parentTitle: string;
  canAddFact: boolean;
  canStartPage: boolean;
}) {
  const [on, setOn] = useState(false);
  const [title, setTitle] = useState("");
  const slug = slugify(title);

  return (
    <>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer" }}>
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--pur)" }} />
          MAKE IT A NEW PAGE UNDER “{parentTitle.toUpperCase()}”
        </label>
        <span className="flabel" style={{ color: "var(--muted)" }}>
          YOUR WORDS BECOME ITS FIRST FACT, ON THE SHELF AT ONCE. IT COSTS {COSTS.wikiSubpage}.
        </span>
      </div>

      {on ? (
        <div className="field">
          <label htmlFor="title">THE NEW PAGE&apos;S NAME</label>
          <input
            id="title"
            name="title"
            className="input"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Orcish Foundries"
            autoComplete="off"
            required
          />
          <span className="flabel" style={{ color: "var(--muted)" }}>
            /wiki/{slug || "…"}
          </span>
        </div>
      ) : null}

      {on ? (
        <button
          type="submit"
          formAction={addSubpage}
          className={`btn btn-lg btn-block${canStartPage ? " btn-mag" : ""}`}
          aria-disabled={!canStartPage}
          disabled={!canStartPage}
        >
          {canStartPage ? (
            <>
              START THE PAGE <Cost n={COSTS.wikiSubpage} />
            </>
          ) : (
            `REST FIRST · A PAGE TAKES ${COSTS.wikiSubpage}`
          )}
        </button>
      ) : (
        <button type="submit" className={`btn btn-lg btn-block${canAddFact ? " btn-purple" : ""}`} aria-disabled={!canAddFact}>
          {canAddFact ? (
            <>
              ADD TO THE PAGE <Cost n={COSTS.wikiEdit} />
            </>
          ) : (
            "REST FIRST"
          )}
        </button>
      )}
    </>
  );
}
