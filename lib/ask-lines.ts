/** What the chest asks, face to face, for each quest that needs someone else to say yes.
 *  `question` is shown to the person being asked; `waiting` to the one who asked, while they decide.
 *  `them` is the asker's handle (the person whose quest it is). */

export type AskLines = { question: string; waiting: string };

const SPECIES: Record<string, string> = {
  goblin: "a goblin",
  elf: "an elf",
  forsaken: "a Forsaken",
  undead: "an undead",
  human: "a human",
  orc: "an orc",
  shifter: "a shifter",
  spellcaster: "a spellcaster",
  witch: "a witch",
};

export function askLines(slug: string, them: string): AskLines {
  const s = slug.toLowerCase();
  if (s === "trade") return { question: `Trade with ${them}?`, waiting: `${them} is deciding on your trade` };
  if (s === "a-helping-hand") return { question: `Did ${them} help with the problem you put on your profile?`, waiting: `They're deciding if you helped with their problem` };
  if (s === "make-friends" || s.endsWith("-friend") || s === "meet-witch")
    return { question: `Would you call ${them} a friend?`, waiting: `They're deciding if you're a friend` };
  if (s === "orcish-philosophy") return { question: `Was that a fun conversation about philosophy?`, waiting: `They're deciding if it was a fun conversation` };
  if (s.startsWith("culture-") || s === "culture-five") {
    const kind = s.slice(8);
    const name = kind === "forsaken" ? "Forsaken" : kind;
    return {
      question: SPECIES[kind] ? `Did ${them} actually learn anything about ${name} culture?` : `Did ${them} actually learn anything about your culture?`,
      waiting: `They're deciding if you actually learned anything`,
    };
  }
  if (s.includes("spell")) return { question: `Was ${them}'s spell cool, or at least fun?`, waiting: `They're deciding if your spell was cool` };
  if (s.includes("potion")) return { question: `Was ${them}'s potion experience cool or fun?`, waiting: `They're deciding if your potion was fun` };
  if (s.includes("workshop")) return { question: `Was ${them} at the workshop?`, waiting: `They're deciding if you were at the workshop` };
  if (s.includes("support-group")) return { question: `Was ${them} at the support group?`, waiting: `They're deciding if you were at the support group` };
  if (s === "first-timer") return { question: `Did ${them} bring someone new to the café?`, waiting: `They're deciding if you brought someone new` };
  if (s === "learn-leylines") return { question: `Does ${them} know about leylines now?`, waiting: `They're deciding if you know about leylines now` };
  return { question: `Did ${them} do this with you?`, waiting: `They're deciding` };
}
