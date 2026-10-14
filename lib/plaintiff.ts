// Form 12-A, the City Office of Civic Plaintiff Registration. The wording and the
// choices are the old Google Form's. The right answers to its code questions are
// NOT here: they are checked in the database (cr_submit_plaintiff), so they never
// reach the browser or the repo.

export const REALMS = [
  { value: "new-world", label: "1. New World" },
  { value: "old-world", label: "2. Old World" },
  { value: "planar-outsider", label: "3. Planar Outsider" },
  { value: "other", label: "4. Other" },
] as const;

export const DISTRICTS = [
  { value: "city", label: "1. City District", section: "City District Resident Information", field: "City ADC" },
  { value: "gate", label: "2. Gate Districts", section: "Gate District Resident Information", field: "Gate ADC" },
  { value: "outland", label: "3. Outlands", section: "Outland District Resident Information", field: "Outland ADC" },
] as const;

export const SPECIES = [
  { value: "orc", label: "1. Orc", section: "ORC-RI" },
  { value: "human", label: "2. Human", section: "HUMAN-RI" },
  { value: "shifter", label: "3. Shifter", section: "SHIFTER-RI" },
  { value: "elf", label: "4. Elf", section: "ELF-RI" },
  { value: "planar", label: "5. Planar", section: "PLANAR-EX" },
] as const;

/** Which question an error belongs under, and what the form said. */
export const PLAINTIFF_ERRORS = {
  incomplete: { field: "form", message: "Please answer every question marked with a star." },
  bad_adc: { field: "district_code", message: "INCORRECT ADC" },
  bad_sdc: { field: "species_code", message: "Incorrect SDC" },
  bad_pcode: { field: "pcode", message: "RA SERIES NOT FOUND" },
} as const;

export type PlaintiffError = { field: string; message: string };
