// Registering to use the app: which part of the City you live in, and your kind. The right
// answers to the code questions are NOT here: they are checked in the database (cr_register),
// so they never reach the browser or the repo. (The two examples shown on the welcome page
// are the only ones that are public.)

export const DISTRICTS = [
  { value: "city", label: "City District", field: "ADC", example: "the City District is 856" },
  { value: "gate", label: "Gate Districts", field: "ADC", example: "" },
  { value: "outland", label: "Outlands", field: "ADC", example: "" },
  { value: "enclave", label: "Elven Enclaves", field: "ADC", example: "the Elven Enclaves are 111" },
] as const;

export const SPECIES = [
  { value: "orc", label: "Orc", example: "Orcs are 33110" },
  { value: "human", label: "Human", example: "" },
  { value: "shifter", label: "Shifter", example: "" },
  { value: "elf", label: "Elf", example: "" },
  { value: "planar", label: "Planar / Forsaken", example: "" },
] as const;

/** Which question an error belongs under, and what the form said. */
export const PLAINTIFF_ERRORS = {
  incomplete: { field: "form", message: "Please answer every question marked with a star." },
  bad_adc: { field: "district_code", message: "That is not the ADC for that part of the City. Check it and try again." },
  enclave_elves: { field: "species", message: "Only elves live in the Elven Enclaves. Choose Elf, or a different part of the City." },
  bad_sdc: { field: "species_code", message: "That is not the SDC for that species. Check it and try again." },
} as const;

export type PlaintiffError = { field: string; message: string };
