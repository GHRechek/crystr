/** Bump TERMS_VERSION when the terms change in a way people should agree to again. */
export const TERMS_VERSION = 1;

export const TERMS_PARAGRAPHS: string[] = [
  "This is a companion app that serves as an extension of Crossroads Unity. Conversations and events on this application are strictly fictional and should be taken as such. Any resemblance to actual persons, living or dead, or actual locations are either coincidental or in good fun. Please remain respectful to the out-of-character world around you.",
  "This platform requires all participants to adhere to the PLS code of conduct.",
  "Real world harassment and discrimination will not be tolerated. This includes discrimination based on race, gender, sexuality, age, or ability.",
  "Crossroads Unity can center difficult and personal topics. All safety tools and regulations for in person play remain in effect online.",
  "Refusing to use or acknowledge the safety tools outlined in the event’s rules is also considered a breach of this code.",
  "If you are subjected to unethical behavior, you have the right to report it. Please reach out to an organizer, and let us know.",
  "PLS reserves the right to take corrective action against prohibitive behaviors, and violations may result in dismissal from the event and/or refusal of future participation.",
];

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "Harassment" },
  { value: "discrimination", label: "Discrimination" },
  { value: "safety", label: "A safety concern" },
  { value: "other", label: "Something else" },
];

export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);
