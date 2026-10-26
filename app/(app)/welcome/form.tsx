"use client";

import { useEffect, useState, useTransition } from "react";
import { completeWelcome } from "@/lib/actions";
import { DISTRICTS, SPECIES, type PlaintiffError } from "@/lib/plaintiff";
import { corrupt } from "@/lib/crystr";

type Draft = {
  handle: string;
  displayName: string;
  district: string;
  districtCode: string;
  species: string;
  speciesCode: string;
  caster: boolean;
  arcn: string;
};

/** Name and registry in one go. What has been filled in is kept on this device, so a trip to
 *  the wiki to look something up (or a wrong answer) never loses it. */
export function WelcomeForm({
  userId,
  handle,
  displayName,
  hasFace,
}: {
  userId: string;
  handle: string;
  displayName: string;
  hasFace: boolean;
}) {
  const [v, setV] = useState<Draft>({
    handle,
    displayName,
    district: "",
    districtCode: "",
    species: "",
    speciesCode: "",
    caster: false,
    arcn: "",
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<PlaintiffError | null>(null);
  const [pending, start] = useTransition();
  const key = `crystr.welcome.${userId}`;

  // Bring back what was filled in before.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setV((cur) => ({ ...cur, ...(JSON.parse(saved) as Partial<Draft>) }));
    } catch {
      // No storage, or an unreadable draft: start from what the profile has.
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      // Nothing to do without storage.
    }
  }, [v, ready, key]);

  const set = <K extends keyof Draft>(k: K, value: Draft[K]) => setV((cur) => ({ ...cur, [k]: value }));

  const d = DISTRICTS.find((x) => x.value === v.district);
  const sp = SPECIES.find((x) => x.value === v.species);
  const other = v.species === "other";
  const examples = SPECIES.flatMap((x) => ("example" in x ? [x.example] : []));
  const nameDone = v.handle.trim().length > 0;
  const booksDone = !!(v.district && v.districtCode.trim() && v.species && v.speciesCode.trim() && (!v.caster || v.arcn.length === 8));
  const problem = (name: string) =>
    error?.field === name ? (
      <span className="flabel" style={{ color: "var(--mag)" }} role="alert">
        {error.message}
      </span>
    ) : null;

  return (
    <form
      className={other ? "registry-corrupt" : undefined}
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
        2 · YOUR NAME{nameDone ? " ✓" : ""}
      </div>
      <div className="field">
        <label htmlFor="handle">HANDLE *</label>
        <input
          id="handle"
          name="handle"
          className="input"
          value={v.handle}
          onChange={(e) => set("handle", e.target.value)}
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
        <input
          id="display_name"
          name="display_name"
          className="input"
          value={v.displayName}
          onChange={(e) => set("displayName", e.target.value)}
          maxLength={40}
          autoComplete="off"
        />
      </div>

      <div className="px" style={{ fontSize: 11, color: "var(--pur-pale)" }}>
        3 · THE CITY&apos;S BOOKS{booksDone ? " ✓" : ""}
      </div>

      <div className="field">
        <label htmlFor="district">WHICH PART OF THE CITY DO YOU LIVE IN? *</label>
        <select id="district" name="district" className="input" required value={v.district} onChange={(e) => set("district", e.target.value)}>
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
          A three-digit number for the part of the City you live in.
          {d ? ` Enter the one for the ${d.label}.` : ""}
        </div>
        <input
          id="district_code"
          name="district_code"
          className="input"
          value={v.districtCode}
          onChange={(e) => set("districtCode", e.target.value)}
          maxLength={24}
          required
          autoComplete="off"
          inputMode="numeric"
        />
        {problem("district_code")}
      </div>

      <div className="field">
        <label htmlFor="species">WHAT IS YOUR SPECIES? *</label>
        <select id="species" name="species" className="input" required value={v.species} onChange={(e) => set("species", e.target.value)}>
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

      {v.district === "enclave" && v.species && v.species !== "elf" ? (
        <div className="banner-note banner-mag" role="alert">
          Only elves live in the Elven Enclaves. Choose Elf, or a different part of the City.
        </div>
      ) : null}

      {other ? (
        <div className="banner-note banner-mag" role="alert" aria-label="Contact your local Crystr administrator.">
          <span aria-hidden>{corrupt("CONTACT YOUR LOCAL CRYSTR ADMINISTRATOR.", 1)}</span>
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="species_code">YOUR SPECIES DESIGNATION CODE (SDC) *</label>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
          A five-digit number for your kind. For example, {examples.join(" and ")}.
          {sp && !other ? ` Enter the one for ${sp.label}.` : ""}
        </div>
        <input
          id="species_code"
          name="species_code"
          className="input"
          value={v.speciesCode}
          onChange={(e) => set("speciesCode", e.target.value)}
          maxLength={24}
          required
          autoComplete="off"
          inputMode="numeric"
        />
        {problem("species_code")}
        {problem("species")}
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, cursor: "pointer" }}>
          <input
            type="checkbox"
            name="spellcaster"
            checked={v.caster}
            onChange={(e) => set("caster", e.target.checked)}
            style={{ width: 22, height: 22, accentColor: "var(--pur)" }}
          />
          ARE YOU A REGISTERED SPELLCASTER?
        </label>
        {v.caster && v.species === "planar" ? (
          <div className="banner-note banner-mag" role="alert">
            Contact arcane enforcement immediately.
          </div>
        ) : null}
        {problem("spellcaster")}
      </div>

      {v.caster ? (
        <div className="field">
          <label htmlFor="arcn">YOUR ARCANE REGISTRY CODEX NUMBER (ARCN) *</label>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--muted)" }}>
            ARCNs contain 8 digits. The Magic page on the wiki can tell you more.
          </div>
          <input
            id="arcn"
            name="arcn"
            className="input"
            value={v.arcn}
            onChange={(e) => set("arcn", e.target.value.replace(/\D/g, ""))}
            maxLength={8}
            required
            autoComplete="off"
            inputMode="numeric"
            pattern="[0-9]{8}"
          />
          {problem("arcn")}
        </div>
      ) : null}

      {error?.field === "form" ? <div className="banner-note banner-mag">{error.message}</div> : null}

      <button type="submit" className="btn btn-lg btn-purple btn-block" disabled={pending || other}>
        {pending ? "CHECKING…" : "REGISTER AND ENTER THE CITY"}
      </button>
    </form>
  );
}
