import { createTextAttributes, type CliRenderer, type KeyEvent } from "@opentui/core";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useEffect, useReducer, useRef } from "react";
import { HARNESSES, EFFORTS } from "./data";
import { SlotEngine, type Column } from "./engine";

const FRAME_MS = 70;

// No hardcoded colors — we lean entirely on the terminal's own palette via
// text attributes (bold / dim / inverse), so the machine matches whatever
// theme the user runs.
const A = {
  bold: createTextAttributes({ bold: true }),
  dim: createTextAttributes({ dim: true }),
  inv: createTextAttributes({ inverse: true }),
  invBold: createTextAttributes({ inverse: true, bold: true }),
};

// Size every reel to the widest possible label so a long model name
// ("GPT-5.3-codex-spark") never wraps and shoves the layout around.
const ACTIVE_TITLE = "▸ HARNESS ◂"; // widest decorated title
const MAX_LABEL = Math.max(
  ACTIVE_TITLE.length,
  ...HARNESSES.map((h) => h.label.length),
  ...HARNESSES.flatMap((h) => h.models.map((m) => m.label.length)),
  ...EFFORTS.map((e) => e.length),
);
const CONTENT_W = MAX_LABEL + 2; // a space of breathing room each side
const REEL_W = CONTENT_W + 4; // + border (1×2) + padding (1×2)

/** Center a label within a fixed width so the inverse payline fills the row. */
function payline(label: string, w: number): string {
  if (label.length >= w) return label.slice(0, w);
  const total = w - label.length;
  const left = Math.floor(total / 2);
  return " ".repeat(left) + label + " ".repeat(total - left);
}

function Reel({ col, active, done }: { col: Column; active: boolean; done: boolean }) {
  const L = col.labels.length;
  const at = (o: number) => col.labels[(col.idx + o + L * 8) % L]!;
  const stopped = col.state === "stopped";

  // The center "payline" is always inverse; active/stopped reels are bold too.
  const centerAttr = active || stopped ? A.invBold : A.inv;
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
        <text attributes={centerAttr}>{payline(at(0), CONTENT_W)}</text>
        <box style={{ width: "100%", justifyContent: "center" }}>
          <text attributes={A.dim}>{at(1)}</text>
        </box>
      </box>
    </box>
  );
}

export function App({ prompt, onExit }: { prompt: string; onExit: (cmd: string | null) => void }) {
  const renderer = useRenderer();
  const engineRef = useRef<SlotEngine>(undefined as unknown as SlotEngine);
  if (!engineRef.current) engineRef.current = new SlotEngine();
  const engine = engineRef.current;

  const [, force] = useReducer((n: number) => n + 1, 0);
  const acc = useRef(0);

  useEffect(() => {
    const cb = async (deltaMs: number) => {
      if (engine.done) return;
      acc.current += deltaMs;
      let changed = false;
      while (acc.current >= FRAME_MS) {
        acc.current -= FRAME_MS;
        engine.tick();
        changed = true;
      }
      if (changed) force();
      renderer.requestRender(); // keep the loop alive every frame
    };
    renderer.setFrameCallback(cb);
    return () => renderer.removeFrameCallback(cb);
  }, [engine, renderer]);

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
      engine.press();
      force();
    }
  });

  const cmd = engine.command(prompt);

  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text attributes={A.bold}>🎰  S L O T - S L O P  🎰</text>
      <text attributes={A.dim}>task: {prompt}</text>
      <box style={{ height: 1 }} />

      <box style={{ flexDirection: "row", gap: 2 }}>
        {engine.cols.map((col, i) => (
          <Reel key={col.kind} col={col} active={i === engine.active} done={engine.done} />
        ))}
      </box>

      <box style={{ height: 1 }} />

      {engine.done && cmd ? (
        <box style={{ flexDirection: "column" }}>
          <text attributes={A.bold}>🎉 all locked in — press ⏎ to drop to your shell</text>
          <box style={{ height: 1 }} />
          <box style={{ border: true, paddingLeft: 1, paddingRight: 1, flexDirection: "column" }}>
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
  );
}
