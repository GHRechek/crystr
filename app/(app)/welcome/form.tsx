"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { completeWelcome } from "@/lib/actions";
import { DISTRICTS, SPECIES, type PlaintiffError } from "@/lib/plaintiff";
import { BirthdayPicker } from "@/components/birthday-picker";

const DRAFT_FIELDS = [
  "name", "handle", "display_name", "birth_day", "birth_month", "birth_year",
  "district", "district_code", "species", "species_code", "spellcaster", "arcn",
] as const;

/** Your info and the registry in one go. Whatever was typed stays in the boxes if something is
 *  wrong, and survives a trip to the face maker: the draft is kept on this device until the
 *  form goes through. The code questions carry no hints: the wiki is where to look. */
export function WelcomeForm({
  userId,
  handle,
  displayName,
  birthday,
  hasFace,
}: {
  userId: string;
  handle: string;
  displayName: string;
  birthday: string | null;
  hasFace: boolean;
}) {
  const [district, setDistrict] = useState("");
  const [species, setSpecies] = useState("");
  const [caster, setCaster] = useState(false);
  const [error, setError] = useState<PlaintiffError | null>(null);
  const [pending, start] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const draftKey = `crystr.welcome.${userId}`;

  // Put back what was typed before, once, when the form is on screen.
  useEffect(() => {
    const el = form.current;
    if (!el) return;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) ?? "null") as Record<string, string> | null;
      if (!saved) return;
      for (const name of DRAFT_FIELDS) {
        const field = el.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (field && saved[name] !== undefined && !field.value) field.value = saved[name];
      }
      if (saved.district) setDistrict(saved.district);
      if (saved.species) setSpecies(saved.species);
      if (saved.spellcaster === "on") setCaster(true);
    } catch {
      // No storage: nothing to put back.
    }
  }, [draftKey]);

  function keepDraft() {
    const el = form.current;
    if (!el) return;
    const fd = new FormData(el);
    const out: Record<string, string> = {};
    for (const name of DRAFT_FIELDS) out[name] = String(fd.get(name) ?? "");
    try {
      localStorage.setItem(draftKey, JSON.stringify(out));
    } catch {
      // No storage: the draft lives only in the boxes.
    }
  }

  const problem = (name: string) =>
    error?.field === name ? (
      <span className="flabel" style={{ color: "var(--mag)" }} role="alert">
        {error.message}
      </span>
    ) : null;

  const hint = { fontSize: 12, lineHeight: 1.5, color: "var(--muted)" } as const;

  return (
    <form
      ref={form}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      onChange={keepDraft}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await completeWelcome(fd);
          if (r) {
            setError(r);
            return;
          }
          try {
            localStorage.removeItem(draftKey);
          } catch {
            // Fine either way.
          }
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
        2 · YOUR INFO
      </div>
      <div className="field">
        <label htmlFor="name">YOUR NAME *</label>
        <div style={hint}>Your real life real person name.</div>
        <input id="name" name="name" className="input" maxLength={120} required autoComplete="name" />
        {problem("name")}
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--rule)", margin: "2px 0" }} />

      <div className="field">
        <label htmlFor="handle">USERNAME *</label>
        <div style={hint}>What the City calls you on Crystr.</div>
        <input
          id="handle"
          name="handle"
          className="input"
          defaultValue={handle}
          maxLength={15}
          pattern="[a-zA-Z0-9_.\-]+"
          required
          autoComplete="off"
        />
        {problem("handle")}
      </div>
      <div className="field">
        <label htmlFor="display_name">CHARACTER NAME *</label>
        <div style={hint}>Your character&apos;s name.</div>
        <input id="display_name" name="display_name" className="input" defaultValue={displayName} maxLength={40} required autoComplete="off" />
        {problem("display_name")}
      </div>

      <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
        3 · THE CITY&apos;S BOOKS
      </div>

      <BirthdayPicker value={birthday} required />
      {problem("birthday")}

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
        <input id="species_code" name="species_code" className="input" maxLength={24} required autoComplete="off" />
        {problem("species_code")}
        {problem("species")}
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer" }}>
          <input
            type="checkbox"
            name="spellcaster"
            checked={caster}
            onChange={(e) => setCaster(e.target.checked)}
            style={{ width: 22, height: 22, accentColor: "var(--pur)" }}
          />
          ARE YOU A REGISTERED SPELLCASTER?
        </label>
        {caster && species === "planar" ? (
          <div className="banner-note banner-mag" role="alert">
            Contact arcane enforcement immediately.
          </div>
        ) : null}
        {problem("spellcaster")}
      </div>

      {caster ? (
        <div className="field">
          <label htmlFor="arcn">YOUR ARCANE REGISTRY CODEX NUMBER (ARCN) *</label>
          <input id="arcn" name="arcn" className="input" maxLength={24} required autoComplete="off" />
          {problem("arcn")}
        </div>
      ) : null}

      {error?.field === "form" ? <div className="banner-note banner-mag">{error.message}</div> : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block" disabled={pending}>
        {pending ? "CHECKING…" : "REGISTER AND ENTER THE CITY"}
      </button>
    </form>
  );
}
