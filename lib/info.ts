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
  appTitle: "How the app works",
  app: [
    ["Mana", "Everything you do here costs a little mana: a post or a reply 5, a whisper or a like 1. You hold 15 to start, plus 1 for every badge you earn and 7 for every Proof you hold. Run low and the feed starts to blur. Mana comes back at sunrise and at the Mana Well."],
    ["Quests and badges", "Your quests are on the Quests tab. Some you do on your own, some with someone else: they show you their code, you scan it, and it counts right away. Finishing a quest earns its badge. I’m a Helper never runs out: help someone with their problem, scan their code, and it counts."],
    ["Historikals", "Creatures to collect, trade and battle: hundreds of them, common, uncommon, rare, epic and mythic (white, green, blue, purple and red outlines). Each has one or two types (fire, tide, nature, ward, feral, dark or spirit), hearts and moves. Some roll their type when you find them, so two of the same creature can be different colours. You earn draws: a summon (usually a rare) for every main quest you finish, and a find for each person you help, each first step you finish, each side quest (and again each month after, for the ones a witch likes or someone confirms), every five battles you win, and on your birthday. They stack up; open them from the monster button beside your portrait, FIND ONE! or SUMMON ONE!, a chest at a time. Hearts lost in a battle stay lost until you heal them on Your Historikals, in your face menu: two mana a heart."],
    ["Trading and battles", "Face to face only. Tap the monster face beside your portrait and choose TRADE or BATTLE, then scan their code. To trade, you each drag one in. You battle with your lineup: the four Historikals on top of MY HISTORIKALS in the same menu (hold one and drag it into a slot). Lead with one in secret, then take turns with pierce, soft or hard moves (pierce through soft, soft covers hard, hard breaks pierce), or swap someone in. Every move has its own element, shown beside it. A hit is two halves: your Historikal’s first type and the move’s element, half a heart each. A half that beats one of their types (and neither of theirs beats it) is a whole heart; one their type beats is nothing. So a hit is anything from nothing to two hearts. Both halves beaten is a bad matchup: nothing lands and you take half a heart. Rares and epics carry a special fourth move in another element (an epic’s with two); a mythic’s fourth is a charge: pick it and that round is spent charging, dealing nothing and taking only half, then it comes out next round with its two elements and a bonus heart that lands even on a clang; on a double super effective it is the one hit in the game that lands four. Fire beats nature and dark, tide beats fire and ward, nature beats tide and feral, ward beats fire and spirit, feral beats ward and tide, dark beats spirit and nature, and spirit beats dark and feral."],
    ["Your Proof", "Your Proof is your battle badge, designed on your Proof page. Choose EPIC BATTLE and put it up (or a Historikal) before you scan. If they put theirs up too, the winner takes a copy of the loser’s Proof. Lose yours and you can’t put it up again for three months. Stake Historikals and the winner takes the other’s."],
    ["Your face", "Tap your portrait to change your face. Every choice is a row you scroll, shown on your own face. Pick a hair top first, then the sides that go with it."],
  ] as [string, string][],
};
