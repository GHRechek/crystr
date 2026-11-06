// Who someone is in the game: a species, and whether they cast. Both are public and chosen on Edit
// Profile. A quest someone else confirms can name the kind of person it has to be.

export const SPECIES = [
  { value: "elf", label: "Elf" },
  { value: "forsaken", label: "Forsaken" },
  { value: "shifter", label: "Shifter" },
  { value: "human", label: "Human" },
  { value: "orc", label: "Orc" },
  { value: "goblin", label: "Goblin" },
  { value: "planar", label: "Planar" },
] as const;

/** What a "with someone" quest can ask for: a species, or a witch, or a spellcaster. */
export const TARGETS = [...SPECIES, { value: "witch", label: "Witch" }, { value: "spellcaster", label: "Spellcaster" }] as const;

export const targetLabel = (v: string | null | undefined) => TARGETS.find((t) => t.value === v)?.label ?? "";

export type Kind = { species?: string | null; spellcaster?: boolean | null; is_witch?: boolean | null };

/** Whether this person is the kind a quest asks for (anyone, when it names no kind). */
export const isKind = (p: Kind, target: string | null | undefined): boolean =>
  !target ? true : target === "witch" ? !!p.is_witch : target === "spellcaster" ? !!p.spellcaster : p.species === target;
