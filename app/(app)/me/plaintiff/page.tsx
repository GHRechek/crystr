import Link from "next/link";
import { requireMe, getPlaintiffForms } from "@/lib/data";
import { redirect } from "next/navigation";
import { DISTRICTS, SPECIES } from "@/lib/plaintiff";
import { ago } from "@/lib/crystr";
import { formatBirthday } from "@/lib/birthday";

const label = (list: readonly { value: string; label: string }[], v?: string) =>
  list.find((x) => x.value === v)?.label.replace(/^\d+\.\s*/, "") ?? "—";

/** The City's books: who has registered. Only witches see the list; registering itself now
 *  happens on the welcome page. */
export default async function PlaintiffPage() {
  const { profile } = await requireMe();
  if (!profile.is_witch) redirect("/me");
  const forms = await getPlaintiffForms();

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
      </div>

      <div>
        <h1 className="screen-title">THE CITY&apos;S BOOKS</h1>
        <div className="screen-intro">Everyone who has registered: their own name, their character, district, species and birthday. Only witches see this.</div>
      </div>

      {true ? (
        <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
              REGISTERED PLAINTIFFS
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
              {forms.length} · ONLY WITCHES SEE THIS
            </div>
          </div>
          {forms.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Nobody has filed Form 12-A yet.</div>
          ) : (
            forms.map((f) => (
              <div key={f.user_id} style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{f.answers.name ?? "—"}</div>
                  {f.answers.character && f.answers.character !== f.answers.name ? (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>as {f.answers.character}</div>
                  ) : null}
                  {f.answers.alias ? (
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>aka {f.answers.alias}</div>
                  ) : null}
                  <span className="spacer" />
                  <div className="px" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {ago(f.submitted_at).toUpperCase()}
                  </div>
                </div>
                <div className="px" style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.7 }}>
                  @{(f.who?.handle ?? "unknown").toUpperCase()} · {label(DISTRICTS, f.answers.district).toUpperCase()} · {label(SPECIES, f.answers.species).toUpperCase()}
                  {f.answers.birthday ? ` · BORN ${formatBirthday(f.answers.birthday).toUpperCase()}` : ""}
                  {f.answers.spellcaster ? ` · CASTER${f.answers.arcn ? ` · ARCN ${f.answers.arcn}` : ""}` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
