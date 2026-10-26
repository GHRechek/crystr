// Registering to use the app: which part of the City you live in, your kind, and whether you
// are a registered spellcaster. The right answers to the code questions are NOT here: they
// are checked in the database (cr_register), so they never reach the browser or the repo.
// The questions carry no hints on purpose, except the three examples below, which are the
// only public ones.

export const DISTRICTS = [
  { value: "city", label: "City District" },
  { value: "gate", label: "Gate Districts" },
  { value: "outland", label: "Outlands" },
  { value: "enclave", label: "Elven Enclaves" },
] as const;

export const SPECIES = [
  { value: "orc", label: "Orc" },
  { value: "human", label: "Human" },
  { value: "goblin", label: "Goblin" },
  { value: "shifter", label: "Shifter" },
  { value: "elf", label: "Elf" },
  { value: "planar", label: "Planar" },
  // Not a species the City registers: choosing it sends you to the administrator.
  { value: "other", label: "Other" },
] as const;

/** The one district code the City lets slip, shown under the ADC box once that part of the
 *  City is chosen. Keyed by the district's value. */
export const ADC_EXAMPLES: Record<string, string> = {
  enclave: "For example, the Elven Enclaves are 111.",
};

/** The two species codes the City lets slip, always under the SDC box. */
export const SDC_NOTE = "Elven SDC: 21876. Orc SDC: 33110. For others, seek public records.";

/** Which question an error belongs under, and what the form said. */
export const PLAINTIFF_ERRORS = {
  incomplete: { field: "form", message: "Please answer every question marked with a star." },
  bad_adc: { field: "district_code", message: "That is not the ADC for that part of the City. Check it and try again." },
  enclave_elves: { field: "species", message: "Only elves live in the Elven Enclaves. Choose Elf, or a different part of the City." },
  planar_caster: { field: "spellcaster", message: "Contact arcane enforcement immediately." },
  bad_arcn: { field: "arcn", message: "That is not an ARCN. Check it and try again." },
  bad_sdc: { field: "species_code", message: "That is not the SDC for that species. Check it and try again." },
  bad_birthday: { field: "birthday", message: "That is not a day that happened. Check the day, the month and the year." },
} as const;

export type PlaintiffError = { field: string; message: string };
