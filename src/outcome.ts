// Decide how a finished spin reads — jackpot, near-miss, or a flavour of loss.
import type { Effort, HarnessDef, ModelDef } from "./data";

export type Vibe = "win" | "lose" | "soclose";
export type OutcomeKind = "win" | "soclose" | "bust" | "loweffort" | "gemini";

export interface Outcome {
  kind: OutcomeKind;
  vibe: Vibe;
  title: string; // big banner
  subtitle: string; // smaller line under it (includes the call to action)
  hue: number | null; // mood hue for banner/marquee; null = rainbow (the win)
}

// "Smart enough" models, and the "dumb" ones that bust no matter what.
const GREAT = new Set(["opus-4.8", "gpt-5.5"]);
const DUMB = new Set(["sonnet-4.6", "haiku-4.6", "gpt-5.4-mini", "gpt-5.3-codex-spark"]);
const GOOD_HARNESS = new Set(["cursor", "claude-code", "codex"]);

export function classify(h: HarnessDef, m: ModelDef, e: Effort): Outcome {
  const lowEffort = e === "no-reasoning" || e === "low";

  // 1. Anything Gemini — tough luck.
  if (m.provider === "google") {
    return {
      kind: "gemini",
      vibe: "lose",
      hue: 265,
      title: "🫠  T O U G H   L U C K  : (",
      subtitle: `you rolled ${m.label}. tough luck :(   —   press ⏎ to run it anyway`,
    };
  }

  // 2. A dumb model busts regardless of everything else.
  if (DUMB.has(m.id)) {
    return {
      kind: "bust",
      vibe: "lose",
      hue: 0,
      title: "💀  B U S T  💀",
      subtitle: `${m.label}?! that thing couldn't ship a semicolon. catastrophic.   —   ⏎ anyway`,
    };
  }

  // Model is great (opus / gpt-5.5) or middling (gpt-5.4).
  if (lowEffort) {
    // 3. Good model AND good harness, but you fumbled the effort — agonizing.
    if (GREAT.has(m.id) && GOOD_HARNESS.has(h.id)) {
      return {
        kind: "soclose",
        vibe: "soclose",
        hue: 38,
        title: "😫  S O   C L O S E !",
        subtitle: `${m.label} on ${h.label}… and then ${e} effort?! so close.   —   ⏎ to run it`,
      };
    }
    // generic low-effort flop
    return {
      kind: "loweffort",
      vibe: "lose",
      hue: 14,
      title: "📉  L O W   E F F O R T",
      subtitle: `${e} reasoning on ${m.label}? you get what you pay for.   —   ⏎ anyway`,
    };
  }

  // 4. Decent model + real effort — jackpot.
  return {
    kind: "win",
    vibe: "win",
    hue: null,
    title: "🎉  J A C K P O T !  🎉",
    subtitle: `${m.label} on ${h.label} @ ${e} effort — now go ship it 🚀   —   ⏎ to run`,
  };
}
