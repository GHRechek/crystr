/** What the chest asks, face to face, for each quest that needs someone else to say yes.
 *  `question` is shown to the person being asked; `waiting` to the one who asked, while they decide.
 *  `them` is the asker's handle (the person whose quest it is). */

export type AskLines = { question: string; waiting: string };

const SPECIES: Record<string, string> = {
  goblin: "a goblin",
  elf: "an elf",
  forsaken: "a Forsaken",
  human: "a human",
  orc: "an orc",
  shifter: "a shifter",
  spellcaster: "a spellcaster",
  witch: "a witch",
};

export function askLines(slug: string, them: string): AskLines {
  const s = slug.toLowerCase();
  if (s === "trade") return { question: `Trade with ${them}?`, waiting: `${them} is deciding on your trade` };
  if (s === "a-helping-hand") return { question: `Did ${them} help you?`, waiting: `They're deciding if you helped them` };
  if (s === "make-friends" || s.endsWith("-friend") || s === "meet-witch")
    return { question: `Would you call ${them} a friend?`, waiting: `They're deciding if you're a friend` };
  if (s === "orcish-philosophy") return { question: `Was that a fun conversation about philosophy?`, waiting: `They're deciding if it was a fun conversation` };
  if (s.startsWith("culture-")) {
    const who = SPECIES[s.slice(8)];
    return {
      question: who ? `Did ${them} talk ${s.slice(8) === "forsaken" ? "Forsaken" : s.slice(8)} culture with you?` : `Did ${them} talk culture with you?`,
      waiting: `They're deciding if you talked culture`,
    };
  }
  if (s.includes("spell")) return { question: `Was ${them}'s spell cool, or at least fun?`, waiting: `They're deciding if your spell was cool` };
  if (s.includes("potion")) return { question: `Did ${them} brew you a potion?`, waiting: `They're deciding if you brewed them a potion` };
  if (s.includes("workshop")) return { question: `Was ${them} at the workshop?`, waiting: `They're deciding if you were at the workshop` };
  if (s.includes("support-group")) return { question: `Was ${them} at the support group?`, waiting: `They're deciding if you were at the support group` };
  if (s === "first-timer") return { question: `Did ${them} bring someone new to the café?`, waiting: `They're deciding if you brought someone new` };
  if (s === "learn-leylines") return { question: `Did you teach ${them} about leylines?`, waiting: `They're deciding if they taught you leylines` };
  return { question: `Did ${them} do this with you?`, waiting: `They're deciding` };
}
