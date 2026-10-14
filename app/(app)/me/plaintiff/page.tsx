import Link from "next/link";
import { requireMe, getPlaintiffSince, getPlaintiffForms } from "@/lib/data";
import { DISTRICTS, REALMS, SPECIES } from "@/lib/plaintiff";
import { ago } from "@/lib/crystr";
import { PlaintiffForm } from "./form";

const label = (list: readonly { value: string; label: string }[], v?: string) =>
  list.find((x) => x.value === v)?.label.replace(/^\d+\.\s*/, "") ?? "—";

/** Form 12-A, the City Office of Civic Plaintiff Registration. */
export default async function PlaintiffPage() {
  const { userId, profile } = await requireMe();
  const since = await getPlaintiffSince(userId);
  const forms = profile.is_witch ? await getPlaintiffForms() : [];

  return (
    <div className="pad" style={{ gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/me" className="btn btn-sm">
          ← ME
        </Link>
        <div className="spacer" />
        {since ? (
          <span className="px" style={{ fontSize: 9, color: "var(--blu-soft)" }}>
            ✓ REGISTERED
          </span>
        ) : null}
      </div>

      <div>
        <div className="screen-title">CITY OFFICE OF CIVIC PLAINTIFF REGISTRATION</div>
        <div className="screen-intro">
          {since
            ? `Form 12-A is on file. You have been a Registered Plaintiff since ${ago(since)}. There is nothing more to do here.`
            : "Form 12-A · Interim Capacity. Answer the questions below to go on the City's books as a Registered Plaintiff. Questions marked * are required."}
        </div>
      </div>

      {since ? null : <PlaintiffForm />}

      {profile.is_witch ? (
        <div className="tile" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="px" style={{ fontSize: 8.5, color: "var(--pur-pale)" }}>
              REGISTERED PLAINTIFFS
            </div>
            <span className="spacer" />
            <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
              {forms.length} · ONLY WITCHES SEE THIS
            </div>
          </div>
          {forms.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Nobody has filed Form 12-A yet.</div>
          ) : (
            forms.map((f) => (
              <div key={f.user_id} style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{f.answers.name ?? "—"}</div>
                  {f.answers.alias ? (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>aka {f.answers.alias}</div>
                  ) : null}
                  <span className="spacer" />
                  <div className="px" style={{ fontSize: 8, color: "var(--muted)" }}>
                    {ago(f.submitted_at).toUpperCase()}
                  </div>
                </div>
                <div className="px" style={{ fontSize: 8, color: "var(--muted)", marginTop: 4, lineHeight: 1.7 }}>
                  @{(f.who?.handle ?? "unknown").toUpperCase()} · {label(REALMS, f.answers.realm).toUpperCase()} ·{" "}
                  {label(DISTRICTS, f.answers.district).toUpperCase()} · {label(SPECIES, f.answers.species).toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
