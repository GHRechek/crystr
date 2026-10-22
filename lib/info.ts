/** What the info menu and the GAME INFO page say about the game. Edit here.
 *  The wording is the event page's own (Crossroads: Unity, Philly Larp Society). */

export const TICKETS_URL = "https://philadelphialarpsociety.ticketspice.com/crossroads-unity";

export const LOCATION = "Unity Java, 5001 Umbria St, Philadelphia";

/** The short blurb in the ☰ menu. Paragraphs are separated by a blank line. */
export const GAME_BLURB =
  "A larp where magic is mundane. The Philadelphia LARP Society invites you into a world where elves sip espresso, witches argue over spell ingredients, and orc programmers stress about deadlines. Magic is real, but your problems? Tragically modern.";

export const GAME_INFO = {
  title: "A larp where magic is mundane.",
  intro: [
    "Every first Saturday at 5001 Umbria St, Philadelphia PA, the Philadelphia LARP Society invites you into a world where elves sip espresso, witches argue over spell ingredients, and orc programmers stress about deadlines. Magic is real, but your problems? Tragically modern. You don’t need to know anything! You can come as yourself, wandering into a world where fantasy books are history, or step into someone new- maybe an elf with corporate burnout or a vampire food blogger chasing the perfect latte. It’s a cozy, low-drama coffee shop vibe, so bring a sketchbook or a board game, and react as if the magic is real. Plus, our baristas will be right there to help you brew up the perfect drink (or story)!",
  ],
  details: [
    ["WHERE", "Unity Java, 5001 Umbria St, Philadelphia, PA 19128"],
    ["WHEN", "Every first Saturday. The event starts at 4 PM, and ends at 7 PM."],
    ["WHO", "You must be at least 18 years old and will need a ticket to attend the event."],
    ["DRINK", "A drink of your choosing is included in the price of admission (with some exceptions)."],
  ] as [string, string][],
  about: [
    "The experience is based on the lived experience of its writers and is intended to be cozy, relaxed, and darkly funny, exploring tough topics through elves, vampires, and orc programmers. At its core, it’s about community- using fantasy to navigate hard conversations, share laughter, and connect across differences.",
  ],
  rulesTitle: "First time larping? We have some rules…",
  rules: [
    ["No antagonists:", "Your character doesn’t have to understand everything, but they should want to."],
    ["Get consent", "before touching people or props."],
    ["Say “Cut”", "to step out of character and chat, or “Too much!” if things get too intense and you need them to ease up."],
  ] as [string, string][],
  rulesAfter:
    "Act like it’s all real and roll with whatever happens. If someone says Really Really, they’re suggesting story or using magic—lean into it, or adjust with too much: “By the stars, I think you really really will spill some of your coffee!”, Someone who doesn’t want to play that out might respond by fumbling slightly but not spilling it and saying “That spell is a bit Too Much!”",
  worldTitle: "What’s your drink of choice?",
  world: [
    "This is a fantasy world, so treat any reference to earth as if it’s a fictional place! We also keep the setting loose so there’s no need to memorize lore or locations. Just pull from whatever fantasy tropes you know and call it ancient (and often problematic) history. All you really need to figure out is who you are and where you’re from: The City (here), The Big City (bigger, louder, worse traffic), or The Old Country (where all the epic stuff went down a thousand years ago). The only real rule? Every character is trying to treat others the way they want to be treated- even if they don’t quite understand how. The great wars are over, the legendary quests are long past, and now? Everyone’s just trying to make rent.",
    "Oh, and magical beings have unique scents. We’ve got essential oils (or Pins) for you, so don’t bring your own! We take care around sensitive noses, and playing with scent isn’t something you have to do.",
  ],
  scents: [
    ["Elves all smell like vanilla. Classic.", "High Elves have a history of being kind of the worst. Lots of privilege, not a lot of self-awareness. These days? They don’t get it, but they want to! There are other types of elves of course; and they don’t have nearly the same baggage but they definitely get lumped together whether they like it or not."],
    ["Shifters smell like chocolate. Delicious.", "Shifters (lycans, mermaids, etc) are naturally magnetic to others, but they still deal with discrimination and doubt about their intentions despite a lot of them being natural caregivers. A lot work in healthcare!"],
    ["Forsaken smell like strawberries! Yum.", "From or marked by the ‘other side’ (Fae, divine, undead, infernal, etc), the forsaken exist in the margins without much legal standing in the mortal world and often can’t get proper paperwork. But don’t worry, this is a sanctuary city. No banishing, magical or otherwise, on the menu!"],
    ["Orcs, Goblins, and humans don’t have particular scents. Neat.", "The progress focused kin are big on community and social change. They’re also very aware that they spent a lot of history as prey or scapegoats. (Ps. You don’t have to go wild with costuming. Some greenish makeup highlights and pointed ears are more than enough for a goblin, etc!)"],
  ] as [string, string][],
};
