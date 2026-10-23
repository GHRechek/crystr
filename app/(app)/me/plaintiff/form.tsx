"use client";

import { useState, useTransition } from "react";
import { submitPlaintiff } from "@/lib/actions";
import { DISTRICTS, REALMS, SPECIES, type PlaintiffError } from "@/lib/plaintiff";

/** Form 12-A. Every answer stays in the boxes if something is wrong. */
export function PlaintiffForm() {
  const [district, setDistrict] = useState<string>("");
  const [species, setSpecies] = useState<string>("");
  const [error, setError] = useState<PlaintiffError | null>(null);
  const [pending, start] = useTransition();

  const d = DISTRICTS.find((x) => x.value === district);
  const sp = SPECIES.find((x) => x.value === species);
  const problem = (field: string) =>
    error?.field === field ? (
      <span className="flabel" style={{ color: "var(--mag)" }}>
        {error.message}
      </span>
    ) : null;

  return (
    <form
      className="pad"
      style={{ gap: 12, padding: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await submitPlaintiff(fd);
          if (r) setError(r);
        });
      }}
    >
      <div className="field">
        <label htmlFor="name">YOUR NAME *</label>
        <input id="name" name="name" className="input" maxLength={120} required autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor="alias">KNOWN ALIAS (IF ANY)</label>
        <input id="alias" name="alias" className="input" maxLength={120} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor="realm">REALM OF ORIGIN *</label>
        <select id="realm" name="realm" className="input" required defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {REALMS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="district">DISTRICT RESIDENCE *</label>
        <select
          id="district"
          name="district"
          className="input"
          required
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="" disabled>
            Choose
          </option>
          {DISTRICTS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </div>

      {d ? (
        <div className="field">
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)", marginBottom: 6 }}>
            {d.section.toUpperCase()}
          </div>
          <label htmlFor="district_code">{d.field.toUpperCase()} *</label>
          <input id="district_code" name="district_code" className="input" maxLength={24} required autoComplete="off" />
          {problem("district_code")}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="species">SPECIES DESIGNATION *</label>
        <select
          id="species"
          name="species"
          className="input"
          required
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
        >
          <option value="" disabled>
            Choose
          </option>
          {SPECIES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </div>

      {sp ? (
        <div className="field">
          <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)", marginBottom: 6 }}>
            {sp.section}
          </div>
          <label htmlFor="species_code">5 DIGIT SDC *</label>
          <input id="species_code" name="species_code" className="input" maxLength={24} required autoComplete="off" />
          {problem("species_code")}
        </div>
      ) : null}

      <div className="field">
        <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)", marginBottom: 2 }}>
          CIVIC REGISTRY · PETITION CODE
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)", marginBottom: 6 }}>
          If you are signing or have signed a petition, please submit its 3 Digit Code
        </div>
        <label htmlFor="pcode">P-CODE REALM ALLOCATION SERIES *</label>
        <input id="pcode" name="pcode" className="input" maxLength={24} required autoComplete="off" />
        {problem("pcode")}
      </div>

      {error?.field === "form" ? (
        <div className="banner-note banner-mag">{error.message}</div>
      ) : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block" disabled={pending} aria-disabled={pending}>
        {pending ? "SENDING…" : "SUBMIT FORM 12-A"}
      </button>
    </form>
  );
}
