// Registering to use the app: which part of the City you live in, and your kind. The right
// answers to the code questions are NOT here: they are checked in the database (cr_register),
// so they never reach the browser or the repo. (The orc code is shown on the welcome page as an example; nothing for the districts is.)

export const DISTRICTS = [
  { value: "city", label: "City District", field: "ADC" },
  { value: "gate", label: "Gate Districts", field: "ADC" },
  { value: "outland", label: "Outlands", field: "ADC" },
  { value: "enclave", label: "Elven Enclaves", field: "ADC" },
] as const;

export const SPECIES = [
  { value: "orc", label: "Orc", example: "Orcs are 33110" },
  { value: "human", label: "Human" },
  { value: "shifter", label: "Shifter" },
  { value: "elf", label: "Elf", example: "Elves are 21876" },
  { value: "planar", label: "Planar" },
  { value: "other", label: "Other" },
] as const;

/** Which question an error belongs under, and what the form said. */
export const PLAINTIFF_ERRORS = {
  incomplete: { field: "form", message: "Please answer every question marked with a star." },
  bad_adc: { field: "district_code", message: "That is not the ADC for that part of the City. Check it and try again." },
  enclave_elves: { field: "species", message: "Only elves live in the Elven Enclaves. Choose Elf, or a different part of the City." },
  planar_caster: { field: "spellcaster", message: "Contact arcane enforcement immediately." },
  bad_arcn: { field: "arcn", message: "That is not an ARCN. Check it and try again." },
  bad_sdc: { field: "species_code", message: "That is not the SDC for that species. Check it and try again." },
} as const;

export type PlaintiffError = { field: string; message: string };
