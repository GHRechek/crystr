"use client";

import { useState, useTransition } from "react";
import { completeWelcome } from "@/lib/actions";
import { DISTRICTS, SPECIES, type PlaintiffError } from "@/lib/plaintiff";

/** Name and registry in one go. Whatever was typed stays in the boxes if something is wrong. */
export function WelcomeForm({ handle, displayName, hasFace }: { handle: string; displayName: string; hasFace: boolean }) {
  const [district, setDistrict] = useState("");
  const [species, setSpecies] = useState("");
  const [error, setError] = useState<PlaintiffError | null>(null);
  const [pending, start] = useTransition();

  const d = DISTRICTS.find((x) => x.value === district);
  const sp = SPECIES.find((x) => x.value === species);
  const problem = (name: string) =>
    error?.field === name ? (
      <span className="flabel" style={{ color: "var(--mag)" }} role="alert">
        {error.message}
      </span>
    ) : null;

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await completeWelcome(fd);
          if (r) setError(r);
        });
      }}
    >
      {error?.field === "face" ? <div className="banner-note banner-mag">{error.message}</div> : null}
      {hasFace ? null : (
        <div className="flabel" style={{ color: "var(--muted)" }}>
          MAKE YOUR FACE (ABOVE) BEFORE YOU REGISTER.
        </div>
      )}

      <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
        2 · YOUR NAME
      </div>
      <div className="field">
        <label htmlFor="handle">HANDLE *</label>
        <input
          id="handle"
          name="handle"
          className="input"
          defaultValue={handle}
          placeholder="what the City will call you"
          maxLength={15}
          pattern="[a-zA-Z0-9_.\-]+"
          required
          autoComplete="off"
        />
        {problem("handle")}
      </div>
      <div className="field">
        <label htmlFor="display_name">DISPLAY NAME</label>
        <input id="display_name" name="display_name" className="input" defaultValue={displayName} maxLength={40} autoComplete="off" />
      </div>

      <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
        3 · THE CITY&apos;S BOOKS
      </div>

      <div className="field">
        <label htmlFor="district">WHICH PART OF THE CITY DO YOU LIVE IN? *</label>
        <select id="district" name="district" className="input" required value={district} onChange={(e) => setDistrict(e.target.value)}>
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

      <div className="field">
        <label htmlFor="district_code">YOUR AREA DESIGNATION CODE (ADC) *</label>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          A short code for the part of the City you live in: three digits, or three letters for the
          Enclaves. For example, {DISTRICTS[0].example}, and {DISTRICTS[3].example}.
          {d ? ` Enter the one for the ${d.label}.` : ""}
        </div>
        <input id="district_code" name="district_code" className="input" maxLength={24} required autoComplete="off" />
        {problem("district_code")}
      </div>

      <div className="field">
        <label htmlFor="species">WHAT IS YOUR SPECIES? *</label>
        <select id="species" name="species" className="input" required value={species} onChange={(e) => setSpecies(e.target.value)}>
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

      {district === "enclave" && species && species !== "elf" ? (
        <div className="banner-note banner-mag" role="alert">
          Only elves live in the Elven Enclaves. Choose Elf, or a different part of the City.
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="species_code">YOUR SPECIES DESIGNATION CODE (SDC) *</label>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          A five-digit number for your kind. For example, {SPECIES[0].example}.
          {sp ? ` Enter the one for ${sp.label}.` : ""}
        </div>
        <input id="species_code" name="species_code" className="input" maxLength={24} required autoComplete="off" inputMode="numeric" />
        {problem("species_code")}
        {problem("species")}
      </div>

      {error?.field === "form" ? <div className="banner-note banner-mag">{error.message}</div> : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block" disabled={pending}>
        {pending ? "CHECKING…" : "REGISTER AND ENTER THE CITY"}
      </button>
    </form>
  );
}
