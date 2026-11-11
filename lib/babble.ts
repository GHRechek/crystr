/**
 * Voices built out of blips rather than words, as the VLVT phone calls have them. Here they are the
 * Historikals" voices: the line in the bubble is what is being said, and the sound carries who is saying
 * it and the shape of the saying. Every Historikal gets the same voice every time, from its slug.
 *
 * Real speech synthesis was the obvious idea and the wrong one. A TTS voice
 * has to be fetched, paid for, keyed, proxied and cached; it differs on every
 * device when it is free and costs money per line when it is not; and the
 * moment it says an actual sentence it starts competing with the sentence
 * already on the screen. Two versions of the same words, one always slightly
 * ahead of the other.
 *
 * So nobody says anything. Each syllable is one short pitched blip, and the
 * line on screen is what is being said -- the sound only carries WHO is saying
 * it and the shape of the saying. This is the oldest trick in games with a lot
 * of dialogue and no budget for actors, and it works for the same reason a
 * comic"s speech bubble works: the reader supplies the voice, and the reader"s
 * voice is better than any recording.
 *
 * Everything is synthesised at play time. There are no assets, so there is
 * nothing to download, nothing to cache, and no silence on the first call of a
 * session while a sound file arrives.
 */

/** A person"s voice: where it sits, how much it moves, and what it is made of. */
export interface BabbleVoice {
  /** Centre pitch in Hz. */
  base: number;
  /** How far a syllable can wander from it, as a ratio. */
  wobble: number;
  /** The waveform. Square reads as harder, triangle as softer. */
  type: OscillatorType;
  /** The formant the blips are filtered through — the vowel colour. */
  formant: number;
  /** [Cadence-2026-08-11] This speaker"s words-per-second rate, cadence()"s
   *  `rate` argument. Unset reads as the app default (1.35). */
  rate?: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** What the voice is coming out of, as far as pitch is concerned. */
export interface VoiceRead {
  /** Their pronouns, when the board knows them. */
  pronouns?: "he/him" | "she/her" | "they/them";
  /** A fallback read off the first name, when it does not. */
  femme?: boolean;
  /** Their size on the board, 1..5. Bigger people carry lower and heavier. */
  lvl?: number;
  /**
   * [Cadence-2026-08-11] A keeper-set pace for this character, 0.6 (drawl)
   * to 1.6 (clipped). Scales the whole cadence without touching its shape.
   */
  cadence?: number;
  /**
   * [VoicePitch-2026-08-11] A keeper-set pitch for this character, 0.6 (low)
   * to 1.6 (high), 1 neutral. Applied on top of the derived voice rather
   * than replacing it, so the character keeps their waveform and manner and
   * only the register moves — the slider tunes the person, it does not swap
   * them for a different one.
   */
  pitch?: number;
}

/**
 * [EveryoneSoundsLikeThemselves-2026-08-09] The voice a given name always has.
 *
 * Derived rather than stored, for the same reason their two backgrounds are:
 * the board has hundreds of people on it and none of them has a voice field.
 * Same person, same voice, on every device, for ever.
 *
 * Three things move it. Pronouns set the BAND -- the ranges below are the
 * ordinary ones for adult speaking voices, and they overlap, because real ones
 * do; they/them and anybody the board has no read on land in the middle rather
 * than being given a fourth invented register. Their size on the board leans it
 * down and darkens the formant, on the plain reading that a huge grip carries
 * differently from a small source. And a per-name hash spreads them across
 * whatever band they land in, so two women in a pact are two voices rather than
 * one voice twice.
 *
 * Deliberately NOT modelled: heritage. There is no acoustic fact underneath it
 * -- a surname does not set a fundamental frequency -- so any mapping I wrote
 * would be a stereotype with a number attached, dressed up as physics.
 */
export function voiceFor(seed: string, read: VoiceRead = {}): BabbleVoice {
  const h = hash(`voice:${seed}`);
  const femme =
    read.pronouns === "she/her"
      ? true
      : read.pronouns === "he/him"
        ? false
        : read.pronouns === "they/them"
          ? null
          : read.femme === undefined
            ? null
            : read.femme;
  /* Band, then position in it. Roughly: masc 104-176, femme 188-300, and the
     middle register 148-232 for they/them and for anyone unread. */
  const span = femme === true ? [188, 112] : femme === false ? [104, 72] : [148, 84];
  const lvl = Math.max(1, Math.min(5, read.lvl || 3));
  /* Size pulls down by up to a tone and a half across the ladder. */
  const weight = 1 - (lvl - 3) * 0.035;
  const types: OscillatorType[] = ["square", "triangle", "sawtooth", "square"];
  /* [VoicePitch-2026-08-11] The slider, clamped to its own range. The base
     moves with it fully; the formant follows at half strength (square root),
     because a voice pitched up brightens a little but does not become a
     different mouth. */
  const tune = Math.max(0.6, Math.min(1.6, read.pitch ?? 1));
  /* [Cadence-2026-08-11] The pace slider, carried on the voice so every
     consumer — the word fade, the blips, the reveal timing — reads ONE
     number and stays in step. */
  const pace = Math.max(0.6, Math.min(1.6, read.cadence ?? 1));
  return {
    rate: Math.round(1.35 * pace * 100) / 100,
    base: Math.round((span[0] + (h % span[1])) * weight * tune),
    /* Bigger people are steadier; small ones chatter. */
    wobble: 0.08 + ((h >>> 8) % 12) / 100 + (5 - lvl) * 0.008,
    type: types[(h >>> 16) % types.length],
    /* The vowel colour, darkened by size the same way the pitch is. */
    formant: Math.round((620 + ((h >>> 20) % 900)) * (1 - (lvl - 3) * 0.05) * Math.sqrt(tune)),
  };
}

/** Rough syllable count: vowel groups, floored at one, capped so no single
 *  word turns into a machine-gun. */
function syllables(word: string): number {
  const m = word.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g);
  return Math.max(1, Math.min(4, m ? m.length : 1));
}

/** One word"s worth of speech: when it starts, and how it is said. */
export interface Beat {
  /** Seconds from the start of the line. */
  at: number;
  /** How long the word itself takes, before any pause after it. */
  dur: number;
  /** Per-syllable stress, 0..1. */
  stress: number[];
}

/** Base length of an unstressed syllable. Everything else scales off this. */
const SYL = 0.052;
/** The breath between one word and the next. */
const GAP = 0.022;

/**
 * [SpeechHasARhythm-2026-08-09] Turn a line into a cadence.
 *
 * The first version put one run of blips under each word at a fixed interval,
 * because that was the interval the words appeared at. It was in perfect time
 * and sounded like nothing on earth: real speech is not metronomic, and a
 * metronome is exactly what you hear the moment every word takes the same
 * number of milliseconds regardless of whether it is "a" or "backgrounds".
 *
 * So the CADENCE leads and the display follows it, rather than the other way
 * round. Long words take longer. Commas and semicolons get a short breath,
 * full stops and question marks a real one. The first syllable of a word worth
 * saying is stressed -- longer, louder and a little higher -- and the little
 * connecting words are thrown away almost unstressed, which is the single
 * biggest difference between speech and a list of words read out.
 *
 * A deterministic jitter per word keeps two identical sentences from landing
 * identically, without ever making the same sentence land differently twice.
 */
export function cadence(words: string[], rate = 1): Beat[] {
  const out: Beat[] = [];
  let t = 0;
  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;
    const bare = word.replace(/[^A-Za-z’\x27]/g, "");
    const n = syllables(word);
    /* Function words -- the, and, of, to, a -- are the ones a speaker hurries
       past. Anything four letters or longer is carrying meaning and gets the
       stress. */
    const heavy = bare.length >= 4;
    const wh = hash(word);
    const jitter = 1 + ((((wh >>> 3) % 200) - 100) / 100) * 0.12;
    const stress: number[] = [];
    let dur = 0;
    for (let k = 0; k < n; k++) {
      /* English stresses early. First syllable of a content word carries it;
         the rest of the word falls away. */
      const st = heavy ? (k === 0 ? 1 : 0.35) : 0.2;
      stress.push(st);
      dur += SYL * (0.8 + st * 0.8) * jitter;
    }
    out.push({ at: t / rate, dur: dur / rate, stress });
    t += dur + GAP;
    /* Punctuation is the only place a written line tells you where the
       speaker breathed, so it is the only place worth listening to. */
    if (/[,;:—-]$/.test(word)) t += 0.11;
    else if (/[.!?…]["”’\x27]?$/.test(word)) t += 0.24;
  }
  return out.map((b) => ({ ...b, at: b.at, dur: b.dur }));
}

/** How long the whole line takes to say, pauses included. */
export function cadenceLength(beats: Beat[]): number {
  const last = beats[beats.length - 1];
  return last ? last.at + last.dur : 0;
}

let shared: AudioContext | null = null;
function context(): AudioContext | null {
  try {
    if (shared && shared.state !== "closed") return shared;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    shared = new Ctor();
    return shared;
  } catch {
    return null;
  }
}

/** How loud a syllable is. Under the ringback on purpose: it is texture. */
const LEVEL = 0.055;
/** One blip. Short enough to be a consonant-vowel, long enough to have pitch. */
const BLIP = 0.062;

/**
 * Speak a line, on the cadence it was measured at. Returns a stop function --
 * hanging up mid-sentence has to cut the voice off, which is the entire reason
 * this schedules rather than fires and forgets.
 *
 * Scheduled against the audio clock rather than with timers: `setTimeout` at
 * these intervals drifts audibly against an animation running off the
 * compositor, and a voice half a syllable behind its own text is worse than no
 * voice at all.
 */
export function speakBabble(
  words: string[],
  voice: BabbleVoice,
  opts: { start?: number; rate?: number; beats?: Beat[] } = {},
): () => void {
  const audio = context();
  if (!audio) return () => undefined;
  try {
    void audio.resume?.();
  } catch {
    /* not allowed to say so yet */
  }

  const beats = opts.beats ?? cadence(words, opts.rate ?? voice.rate ?? 1);
  const said = words.filter((w) => w.trim());
  const total = cadenceLength(beats) || 1;
  const t0 = audio.currentTime + (opts.start ?? 0) + 0.02;
  const nodes: AudioScheduledSourceNode[] = [];
  /* A question turns up at the end; a statement settles. Read off the last
     word, because that is where a reader finds it too. */
  const asks = /[?]["”’\x27]?$/.test(said[said.length - 1] || "");

  beats.forEach((beat, wi) => {
    let inner = 0;
    beat.stress.forEach((st, k) => {
      const when = t0 + beat.at + inner;
      const dur = (beat.dur / beat.stress.length) * (0.62 + st * 0.3);
      inner += beat.dur / beat.stress.length;

      /* [SpeechHasARhythm-2026-08-09] Two contours, both real. Across the whole
         line the voice declines -- everybody runs out of breath, and a line
         that ends where it started sounds like a machine. Inside a word it
         falls too, except on the stressed syllable, which lifts. A question
         reverses the last of it. */
      const through = (beat.at + inner) / total;
      const decline = 1 - through * 0.11;
      const ask = asks && through > 0.72 ? 1 + (through - 0.72) * 0.5 : 1;
      const lift = 1 + st * 0.09 - k * 0.03;
      const wh = hash(said[wi] || "");
      const jit = 1 + ((((wh >>> (k * 5)) % 200) - 100) / 100) * voice.wobble;
      const hz = Math.max(70, voice.base * decline * ask * lift * jit);

      const osc = audio.createOscillator();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(hz, when);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, hz * (st > 0.6 ? 0.94 : 0.86)), when + dur);

      /* The formant is what makes it a mouth rather than a beeper: one narrow
         resonance in the vowel range. Moving it per syllable is what reads as
         different vowels, which is most of why a run of these sounds like a
         word instead of a bleep. */
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = voice.formant * (0.78 + ((wh >>> (k * 3)) % 44) / 100);
      band.Q.value = 3.6;

      /* And a lid on top, because this is coming down a phone line: nothing
         above about three and a half kilohertz ever made it through one. */
      const lid = audio.createBiquadFilter();
      lid.type = "lowpass";
      lid.frequency.value = 3400;

      const gain = audio.createGain();
      const level = LEVEL * (0.55 + st * 0.6);
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(level, when + Math.min(0.014, dur * 0.28));
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);

      osc.connect(band);
      band.connect(lid);
      lid.connect(gain);
      gain.connect(audio.destination);
      osc.start(when);
      osc.stop(when + dur + 0.01);
      nodes.push(osc);

      /* A very short scrape of noise on the front of a stressed syllable. It
         is doing the job a consonant does -- giving the vowel an edge to start
         from -- and without it every syllable begins the same soft way and the
         whole line smears together. */
      if (st > 0.6) {
        const frames = Math.max(1, Math.floor(audio.sampleRate * 0.013));
        const buf = audio.createBuffer(1, frames, audio.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < frames; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / frames);
        const src = audio.createBufferSource();
        src.buffer = buf;
        const hp = audio.createBiquadFilter();
        hp.type = "bandpass";
        hp.frequency.value = 1700;
        hp.Q.value = 0.9;
        const cg = audio.createGain();
        cg.gain.value = LEVEL * 0.5;
        src.connect(hp);
        hp.connect(cg);
        cg.connect(audio.destination);
        src.start(when);
        nodes.push(src);
      }
    });
  });

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    for (const o of nodes) {
      try {
        o.stop();
      } catch {
        /* already finished */
      }
    }
  };
}


/** A Historikal"s voice: from its slug, so the same creature always sounds the same. Bigger ones (more
 *  hearts) carry lower and heavier; the little ones chatter. */
export function creatureVoice(slug: string, hearts = 3): BabbleVoice {
  return voiceFor(slug, { lvl: Math.max(1, Math.min(5, hearts + 1)) });
}

/** The cry it gives when the void takes it: a roar, a squeak, a wail or a scream, chip-tune style. */
export function playCry(kind: "roar" | "squeak" | "wail" | "scream", voice?: BabbleVoice) {
  const audio = context();
  if (!audio) return;
  try { void audio.resume?.(); } catch { /* not yet */ }
  const t = audio.currentTime + 0.02;
  const base = voice?.base ?? 160;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const lid = audio.createBiquadFilter(); lid.type = "lowpass"; lid.frequency.value = 3600;
  const vib = audio.createOscillator(); const vg = audio.createGain();
  vib.connect(vg); vg.connect(osc.frequency);
  let dur = 0.6;
  if (kind === "roar") {
    osc.type = "sawtooth"; dur = 0.75;
    osc.frequency.setValueAtTime(Math.max(50, base * 0.45), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, base * 0.3), t + dur);
    vib.frequency.value = 23; vg.gain.value = base * 0.08;
  } else if (kind === "squeak") {
    osc.type = "triangle"; dur = 0.32;
    osc.frequency.setValueAtTime(base * 5, t);
    osc.frequency.exponentialRampToValueAtTime(base * 7.5, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(base * 4, t + dur);
    vib.frequency.value = 40; vg.gain.value = base * 0.4;
  } else if (kind === "wail") {
    osc.type = "triangle"; dur = 1.1;
    osc.frequency.setValueAtTime(base * 1.6, t);
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(base * 0.8, t + dur);
    vib.frequency.value = 6; vg.gain.value = base * 0.12;
  } else {
    osc.type = "square"; dur = 0.7;
    osc.frequency.setValueAtTime(base * 2.2, t);
    osc.frequency.exponentialRampToValueAtTime(base * 4.5, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(base * 2.6, t + dur);
    vib.frequency.value = 14; vg.gain.value = base * 0.25;
  }
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(LEVEL * 1.6, t + 0.03);
  gain.gain.setValueAtTime(LEVEL * 1.6, t + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(lid); lid.connect(gain); gain.connect(audio.destination);
  vib.start(t); osc.start(t); osc.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
  // A roar has grit in it: a burst of noise under the tone.
  if (kind === "roar" || kind === "scream") {
    const frames = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, frames, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < frames; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / frames) * 0.7;
    const src = audio.createBufferSource(); src.buffer = buf;
    const bp = audio.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = kind === "roar" ? 420 : 1900; bp.Q.value = 0.8;
    const ng = audio.createGain(); ng.gain.value = LEVEL * (kind === "roar" ? 0.9 : 0.5);
    src.connect(bp); bp.connect(ng); ng.connect(audio.destination); src.start(t);
  }
}
