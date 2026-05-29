import { createTextAttributes, RGBA, type CliRenderer, type KeyEvent } from "@opentui/core";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { useEffect, useReducer, useRef } from "react";
import { HARNESSES, EFFORTS } from "./data";
import { SlotEngine, type Column } from "./engine";
import { Confetti } from "./confetti";

const FRAME_MS = 70; // reel step cadence
const VISUAL_MS = 33; // ~30fps re-render for the flashy layers

const A = {
  bold: createTextAttributes({ bold: true }),
  dim: createTextAttributes({ dim: true }),
};
// Reel paylines stay on the terminal's themed ANSI palette (high contrast).
const IDX = {
  black: RGBA.fromIndex(0),
  green: RGBA.fromIndex(2),
  yellow: RGBA.fromIndex(3),
  white: RGBA.fromIndex(7),
};

// ── layout / particle-origin geometry ───────────────────────────────────────
const ACTIVE_TITLE = "▸ HARNESS ◂";
const MAX_LABEL = Math.max(
  ACTIVE_TITLE.length,
  ...HARNESSES.map((h) => h.label.length),
  ...HARNESSES.flatMap((h) => h.models.map((m) => m.label.length)),
  ...EFFORTS.map((e) => e.length),
);
const CONTENT_W = MAX_LABEL + 2;
const REEL_W = CONTENT_W + 4;
const GAP = 2;
const PAD = 1;
const MACHINE_W = REEL_W * 3 + GAP * 2;
const reelCenterX = (i: number) => PAD + i * (REEL_W + GAP) + Math.floor(REEL_W / 2);
const PAYLINE_Y = 8; // approx screen row of the center payline

// ── helpers ──────────────────────────────────────────────────────────────────
function payline(label: string, w: number): string {
  if (label.length >= w) return label.slice(0, w);
  const total = w - label.length;
  const left = Math.floor(total / 2);
  return " ".repeat(left) + label + " ".repeat(total - left);
}

/** HSV (h in degrees) -> #rrggbb. */
function hsv(h: number, s = 1, v = 1): string {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  const to = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function Rainbow({ text, phase, speed = 120, spread = 16 }: { text: string; phase: number; speed?: number; spread?: number }) {
  const chars = [...text];
  return (
    <text attributes={A.bold}>
      {chars.map((ch, i) => (
        <span key={i} fg={hsv(phase * speed + i * spread)}>
          {ch}
        </span>
      ))}
    </text>
  );
}

/** A scrolling rainbow block bar — the Vegas marquee. */
function RainbowBar({ width, phase }: { width: number; phase: number }) {
  const cells = [];
  for (let i = 0; i < width; i++) cells.push(i);
  return (
    <text>
      {cells.map((i) => (
        <span key={i} fg={hsv(-phase * 220 + i * 9)}>
          █
        </span>
      ))}
    </text>
  );
}

function Reel({ col, active, done }: { col: Column; active: boolean; done: boolean }) {
  const L = col.labels.length;
  const at = (o: number) => col.labels[(col.idx + o + L * 8) % L]!;
  const stopped = col.state === "stopped";
  const barBg = stopped ? IDX.green : active && col.state === "stopping" ? IDX.yellow : IDX.white;
  const titleAttr = active && !done ? A.bold : A.dim;
  const title = stopped ? `✔ ${col.title}` : active && !done ? `▸ ${col.title} ◂` : col.title;

  return (
    <box style={{ flexDirection: "column", width: REEL_W, flexShrink: 0, alignItems: "center" }}>
      <box style={{ width: "100%", justifyContent: "center" }}>
        <text attributes={titleAttr}>{title}</text>
      </box>
      <box style={{ width: "100%", flexDirection: "column", border: true, paddingLeft: 1, paddingRight: 1 }}>
        <box style={{ width: "100%", justifyContent: "center" }}>
          <text attributes={A.dim}>{at(-1)}</text>
        </box>
        <text fg={IDX.black} bg={barBg} attributes={A.bold}>
          {payline(at(0), CONTENT_W)}
        </text>
        <box style={{ width: "100%", justifyContent: "center" }}>
          <text attributes={A.dim}>{at(1)}</text>
        </box>
      </box>
    </box>
  );
}

function ConfettiLayer({ confetti, w, h }: { confetti: Confetti; w: number; h: number }) {
  return (
    <box style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 100 }}>
      {confetti.particles.map((p) => {
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        if (x < 0 || x >= w || y < 0 || y >= h) return null;
        return (
          <text key={p.id} style={{ position: "absolute", left: x, top: y }} fg={p.color} attributes={A.bold}>
            {p.char}
          </text>
        );
      })}
    </box>
  );
}

export function App({ prompt, onExit }: { prompt: string; onExit: (cmd: string | null) => void }) {
  const renderer = useRenderer();
  const { width, height } = useTerminalDimensions();
  const engineRef = useRef<SlotEngine>(undefined as unknown as SlotEngine);
  if (!engineRef.current) engineRef.current = new SlotEngine();
  const engine = engineRef.current;

  const confettiRef = useRef<Confetti>(undefined as unknown as Confetti);
  if (!confettiRef.current) confettiRef.current = new Confetti();
  const confetti = confettiRef.current;

  const [, force] = useReducer((n: number) => n + 1, 0);
  const acc = useRef(0); // reel-step accumulator
  const vacc = useRef(0); // visual re-render accumulator
  const phase = useRef(0); // seconds elapsed, drives gradients
  const prevActive = useRef(0);
  const prevDone = useRef(false);

  useEffect(() => {
    const cb = async (deltaMs: number) => {
      const dt = deltaMs / 1000;
      phase.current += dt;

      // advance reels
      if (!engine.done) {
        acc.current += deltaMs;
        while (acc.current >= FRAME_MS) {
          acc.current -= FRAME_MS;
          engine.tick();
        }
      }

      // celebrate when a reel locks in
      if (engine.active > prevActive.current) {
        const justLocked = prevActive.current;
        confetti.burst(reelCenterX(justLocked), PAYLINE_Y, 38);
        prevActive.current = engine.active;
      }
      if (engine.done && !prevDone.current) {
        prevDone.current = true;
        confetti.burst(reelCenterX(2), PAYLINE_Y, 60); // last reel popper
        confetti.rain(width, 80);
      }
      if (engine.done) confetti.rain(width, 2); // steady drizzle while celebrating

      confetti.update(dt, height);

      // throttle the (heavier) re-render of the flashy layers
      vacc.current += deltaMs;
      if (vacc.current >= VISUAL_MS) {
        vacc.current = 0;
        force();
      }
      renderer.requestRender();
    };
    renderer.setFrameCallback(cb);
    return () => renderer.removeFrameCallback(cb);
  }, [engine, renderer, confetti, width, height]);

  const quit = (cmd: string | null) => {
    (renderer as CliRenderer).destroy();
    onExit(cmd);
  };

  useKeyboard((key: KeyEvent) => {
    const isEnter = key.name === "return" || key.name === "enter" || key.sequence === "\r";
    const isSpace = key.name === "space" || key.sequence === " ";
    if (key.name === "q" || key.name === "escape") {
      quit(null);
      return;
    }
    if (engine.done) {
      if (isEnter || isSpace) quit(engine.command(prompt));
      return;
    }
    if (isEnter || isSpace) {
      // every button press throws a little confetti at the active reel
      confetti.burst(reelCenterX(engine.active), PAYLINE_Y, 16);
      engine.press();
      force();
    }
  });

  const cmd = engine.command(prompt);
  const p = phase.current;

  return (
    <>
      <box style={{ flexDirection: "column", padding: 1 }}>
        <Rainbow text="🎰  S L O T - S L O P  🎰" phase={p} />
        <text attributes={A.dim}>task: {prompt}</text>
        <RainbowBar width={MACHINE_W} phase={p} />

        <box style={{ flexDirection: "row", gap: GAP }}>
          {engine.cols.map((col, i) => (
            <Reel key={col.kind} col={col} active={i === engine.active} done={engine.done} />
          ))}
        </box>

        <RainbowBar width={MACHINE_W} phase={p + 0.5} />
        <box style={{ height: 1 }} />

        {engine.done && cmd ? (
          <box style={{ flexDirection: "column" }}>
            <Rainbow text="🎉  J A C K P O T !  🎉   press ⏎ to drop to your shell" phase={p} speed={200} spread={10} />
            <box style={{ height: 1 }} />
            <box style={{ border: true, borderColor: hsv(p * 200), paddingLeft: 1, paddingRight: 1, flexDirection: "column" }}>
              <text attributes={A.bold}>{cmd}</text>
            </box>
          </box>
        ) : (
          <text attributes={A.dim}>
            press <span attributes={A.bold}>⏎ / space</span> to stop the{" "}
            <span attributes={A.bold}>{engine.cols[engine.active]!.title.toLowerCase()}</span> reel
            {"     "}(q to quit)
          </text>
        )}
      </box>
      <ConfettiLayer confetti={confetti} w={width} h={height} />
    </>
  );
}
